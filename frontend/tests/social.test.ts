import { afterEach, beforeEach, expect, test } from "bun:test"
import { socialPopup } from "~/utilities/social"
import { mockApi, resetNuxt, sessionTokens, toasts } from "./fakes"

let receive: (event: Partial<MessageEvent>) => void
let tick: () => void
let closed: boolean
const popup = {
  location: { href: "" },
  closed: false,
  close: () => {
    closed = true
  },
}
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
const emit = (
  data: unknown,
  origin = "https://api.example.com",
  source: unknown = popup,
) => receive({ origin, source: source as Window, data })

beforeEach(() => {
  resetNuxt()
  closed = false
  popup.closed = false
  popup.location.href = ""
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      open: () => popup,
      addEventListener: (_: string, callback: typeof receive) => {
        receive = callback
      },
      removeEventListener: () => {},
      setInterval: (callback: () => void) => {
        tick = callback
        return 1
      },
      clearInterval: () => {},
    },
  })
})
afterEach(() => {
  if (previousWindow)
    Object.defineProperty(globalThis, "window", previousWindow)
  else Reflect.deleteProperty(globalThis, "window")
})

test("accepts tokens only from the expected origin and popup", async () => {
  const tokens = sessionTokens()
  const pending = socialPopup(
    async () => ({ url: "https://idp.example.com/authorize" }),
    "https://api.example.com",
  )
  await Promise.resolve()
  expect(popup.location.href).toBe("https://idp.example.com/authorize")
  emit({ type: "auth:social", tokens }, "https://evil.example.com")
  emit({ type: "auth:social", tokens }, undefined, {})
  emit({ type: "wrong", tokens })
  expect(closed).toBe(false)
  emit({ type: "auth:social", tokens })
  expect(await pending).toEqual(tokens)
  expect(closed).toBe(true)
})
test("rejects errors, invalid tokens, closed popups and unsafe redirects", async () => {
  for (const payload of [
    { type: "auth:social", error: true },
    { type: "auth:social", tokens: {} },
    { type: "auth:social", tokens: { access_token: "", token_type: "bearer" } },
    {
      type: "auth:social",
      tokens: { ...sessionTokens(), refresh_token: {} },
    },
    { type: "auth:social", error: false, tokens: sessionTokens() },
  ]) {
    const pending = socialPopup(
      async () => ({ url: "https://idp.example.com" }),
      "https://api.example.com",
    )
    emit(payload)
    await expect(pending).rejects.toThrow()
  }
  const closedPopup = socialPopup(
    async () => ({ url: "https://idp.example.com" }),
    "https://api.example.com",
  )
  popup.closed = true
  tick()
  await expect(closedPopup).rejects.toThrow()
  await expect(
    socialPopup(
      async () => ({ url: "javascript:alert(1)" }),
      "https://api.example.com",
    ),
  ).rejects.toThrow()
  await expect(
    socialPopup(async () => {
      throw new Error("API failure")
    }, "https://api.example.com"),
  ).rejects.toThrow()
})
test("rejects a popup blocked by the browser", async () => {
  window.open = () => null
  await expect(
    socialPopup(
      async () => ({ url: "https://idp.example.com" }),
      "https://api.example.com",
    ),
  ).rejects.toThrow("Popup blocked")
})
test("social login and linking load the profile after the browser callback", async () => {
  const { user } = await import("./fixtures")
  for (const link of [false, true]) {
    mockApi(
      `${link ? "POST" : "GET"} /login/social/google${link ? "/link" : ""}`,
      { url: "https://idp.example.com" },
    )
    mockApi("GET /users/me", user)
    const auth = useAuthStore()
    const pending = auth.socialLogin("google", link)
    await new Promise((resolve) => setTimeout(resolve, 0))
    emit({ type: "auth:social", tokens: sessionTokens() })
    await pending
    expect(auth.loggedIn).toBe(true)
  }
})
test("social errors preserve the existing session", async () => {
  const auth = useAuthStore()
  const pending = auth.socialLogin("unknown")
  await pending
  expect(toasts[0]!.title).toBe("notifications.loginError")
})
test("social TOTP challenges stop before loading the profile", async () => {
  const { jwt } = await import("./tokens")
  mockApi("GET /login/social/google", { url: "https://idp.example.com" })
  const auth = useAuthStore()
  const pending = auth.socialLogin("google")
  await new Promise((resolve) => setTimeout(resolve, 0))
  emit({
    type: "auth:social",
    tokens: {
      access_token: jwt({ totp: true, exp: 9999999999 }),
      token_type: "bearer",
      refresh_token: null,
    },
  })
  await pending
  expect(auth.loggedIn).toBe(false)
})
