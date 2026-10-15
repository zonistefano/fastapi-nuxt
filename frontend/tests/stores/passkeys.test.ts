import { afterEach, beforeEach, expect, test } from "bun:test"
import {
  jwt,
  mockApi,
  requests,
  resetNuxt,
  sessionTokens,
  toasts,
} from "../fakes"
import { user } from "../fixtures"

const originalNavigator = Object.getOwnPropertyDescriptor(
  globalThis,
  "navigator",
)
const originalCredential = Object.getOwnPropertyDescriptor(
  globalThis,
  "PublicKeyCredential",
)
const bytes = new Uint8Array([1, 2, 3]).buffer
beforeEach(() => {
  resetNuxt()
  Object.defineProperty(globalThis, "PublicKeyCredential", {
    configurable: true,
    value: Object,
  })
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      credentials: {
        get: async () => ({
          id: "credential",
          rawId: bytes,
          type: "public-key",
          getClientExtensionResults: () => ({}),
          response: {
            authenticatorData: bytes,
            clientDataJSON: bytes,
            signature: bytes,
          },
        }),
      },
    },
  })
})
afterEach(() => {
  for (const [key, descriptor] of [
    ["navigator", originalNavigator],
    ["PublicKeyCredential", originalCredential],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

test("uses WebAuthn options and verifies the browser assertion before loading the profile", async () => {
  mockApi("POST /login/passkeys/authenticate/options", {
    ceremony_id: "ceremony",
    options: { challenge: "AQID", rpId: "example.com" },
  })
  mockApi("POST /login/passkeys/authenticate/verify", sessionTokens())
  mockApi("GET /users/me", user)
  await useAuthStore().passkeyLogin()
  expect(useAuthStore().loggedIn).toBe(true)
  expect(useAuthStore().passkeyEnrollmentPending).toBe(false)
  expect(await requests[1]!.json()).toMatchObject({
    ceremony_id: "ceremony",
    credential: { id: "credential", response: { signature: "AQID" } },
  })
})
test("passkey login preserves the TOTP challenge", async () => {
  mockApi("POST /login/passkeys/authenticate/options", {
    ceremony_id: "ceremony",
    options: { challenge: "AQID" },
  })
  mockApi("POST /login/passkeys/authenticate/verify", {
    access_token: jwt({ totp: true, exp: 9999999999 }),
    refresh_token: null,
    token_type: "bearer",
  })
  await useAuthStore().passkeyLogin()
  expect(useAuthStore().loggedIn).toBe(false)
  expect(requests).toHaveLength(2)
  expect(useAuthStore().passkeyTotpChallenge).toBe(true)
  mockApi("POST /login/totp", sessionTokens())
  mockApi("GET /users/me", user)
  await useAuthStore().totpLogin("123456")
  expect(useAuthStore().loggedIn).toBe(true)
  expect(useAuthStore().passkeyEnrollmentPending).toBe(false)
  expect(useAuthStore().passkeyTotpChallenge).toBe(false)
})
test("reports failed explicit passkey authentication", async () => {
  await useAuthStore().passkeyLogin()
  expect(toasts[0]!.title).toBe("notifications.loginError")
})

test("cancellation and passive autofill errors do not show login errors", async () => {
  await useAuthStore().passkeyLogin({ autofill: true })
  expect(toasts).toHaveLength(0)
  mockApi("POST /login/passkeys/authenticate/options", {
    ceremony_id: "ceremony",
    options: { challenge: "AQID" },
  })
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      credentials: {
        get: async () => {
          throw new DOMException("Cancelled", "NotAllowedError")
        },
      },
    },
  })
  expect(await useAuthStore().passkeyLogin()).toBe(false)
  expect(toasts).toHaveLength(0)
})

test("aborted ceremonies do not verify assertions or save tokens", async () => {
  const controller = new AbortController()
  mockApi("POST /login/passkeys/authenticate/options", () => {
    controller.abort()
    return Response.json({
      ceremony_id: "ceremony",
      options: { challenge: "AQID" },
    })
  })
  expect(await useAuthStore().passkeyLogin({ signal: controller.signal })).toBe(
    false,
  )
  expect(requests).toHaveLength(1)
  expect(useAuthStore().loggedIn).toBe(false)
  expect(toasts).toHaveLength(0)
})

test("offers enrollment only after a complete traditional login", async () => {
  mockApi("POST /login/oauth", {
    access_token: jwt({ totp: true, exp: 9999999999 }),
    refresh_token: null,
    token_type: "bearer",
  })
  await useAuthStore().logIn({ username: user.email, password: "password123" })
  expect(useAuthStore().passkeyEnrollmentPending).toBe(false)
  mockApi("POST /login/totp", sessionTokens())
  mockApi("GET /users/me", user)
  await useAuthStore().totpLogin("123456")
  expect(useAuthStore().passkeyEnrollmentPending).toBe(true)
  useAuthStore().passkeyEnrollmentPending = false
  await useAuthStore().getUserProfile()
  expect(useAuthStore().passkeyEnrollmentPending).toBe(false)
})

test.each(["assertion", "verification"])(
  "discards a late %s after switching sign-in method",
  async (stage) => {
    const controller = new AbortController()
    mockApi("POST /login/passkeys/authenticate/options", {
      ceremony_id: "ceremony",
      options: { challenge: "AQID" },
    })
    mockApi("POST /login/passkeys/authenticate/verify", () => {
      controller.abort()
      return Response.json(sessionTokens())
    })
    if (stage === "assertion") {
      const get = navigator.credentials.get.bind(navigator.credentials)
      Object.defineProperty(navigator.credentials, "get", {
        value: async () => {
          const credential = await get()
          controller.abort()
          return credential
        },
      })
    }
    expect(
      await useAuthStore().passkeyLogin({ signal: controller.signal }),
    ).toBe(false)
    expect(useAuthStore().tokenStore.token).toBe("")
    expect(requests).toHaveLength(stage === "assertion" ? 1 : 2)
    expect(toasts).toHaveLength(0)
  },
)
