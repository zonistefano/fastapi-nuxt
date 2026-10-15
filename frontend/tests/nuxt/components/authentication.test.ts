import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { DOMWrapper, flushPromises } from "@vue/test-utils"
import { beforeEach, expect, test, vi } from "vitest"
import Options from "~/components/authentication/Options.vue"
import Methods from "~/components/authentication/Methods.vue"
import Reauthenticate from "~/components/authentication/Reauthenticate.vue"
import {
  apiError,
  apiPaths,
  jwt,
  mockApi,
  requests,
  resetApp,
  sessionTokens,
  signIn,
  submitForm,
  toastTitles,
} from "../helpers"

const {
  navigateTo,
  startRegistration,
  supportsWebAuthn,
  supportsAutofill,
  cancelCeremony,
} = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  startRegistration: vi.fn(),
  supportsWebAuthn: vi.fn(() => true),
  supportsAutofill: vi.fn(async () => false),
  cancelCeremony: vi.fn(),
}))
mockNuxtImport("navigateTo", () => navigateTo)
vi.mock("@simplewebauthn/browser", () => ({
  startRegistration,
  startAuthentication: vi.fn(),
  browserSupportsWebAuthn: supportsWebAuthn,
  browserSupportsWebAuthnAutofill: supportsAutofill,
  WebAuthnAbortService: { cancelCeremony },
}))
const body = () => new DOMWrapper(document.body)
const button = (
  wrapper: { findAll: (selector: string) => DOMWrapper<Element>[] },
  label: string,
) => wrapper.findAll("button").find((item) => item.text() === label)!
const methods = {
  social_providers: ["google"],
  passkeys: true,
  registration: true,
}
const key = {
  id: "key-1",
  name: "Laptop",
  credential_id: "AQID",
  device_type: "singleDevice",
  backed_up: false,
  transports: [],
  created: "2026-01-01",
  modified: "2026-01-01",
}
beforeEach(() => {
  resetApp()
  navigateTo.mockReset()
  startRegistration.mockReset()
  supportsWebAuthn.mockReturnValue(true)
  supportsAutofill.mockResolvedValue(false)
  cancelCeremony.mockClear()
  mockApi("GET /login/methods", methods)
})

test("shows only the available sign-in methods and handles complete logins", async () => {
  const auth = useAuthStore()
  const social = vi.spyOn(auth, "socialLogin").mockImplementation(async () => {
    signIn()
  })
  const passkey = vi
    .spyOn(auth, "passkeyLogin")
    .mockImplementation(async () => {
      signIn()
      return true
    })
  const wrapper = await mountSuspended(Options)
  await button(wrapper, "Continue with google").trigger("click")
  await flushPromises()
  expect(social).toHaveBeenCalledWith("google")
  expect(navigateTo).toHaveBeenCalledWith("/")
  await button(wrapper, "Sign in with a passkey").trigger("click")
  await flushPromises()
  expect(passkey).toHaveBeenCalledOnce()
})
test("optional login routes a TOTP challenge and leaves failed logins on the page", async () => {
  const auth = useAuthStore()
  vi.spyOn(auth, "passkeyLogin").mockImplementation(async () => {
    useTokenStore().setTokens({
      access_token: jwt({ totp: true, exp: 9999999999 }),
      refresh_token: null,
      token_type: "bearer",
    })
    return true
  })
  const wrapper = await mountSuspended(Options)
  await button(wrapper, "Sign in with a passkey").trigger("click")
  await flushPromises()
  expect(navigateTo).toHaveBeenCalledWith("/totp")
  navigateTo.mockReset()
  vi.spyOn(auth, "socialLogin").mockResolvedValue(undefined)
  useTokenStore().deleteTokens()
  await button(wrapper, "Continue with google").trigger("click")
  await flushPromises()
  expect(navigateTo).not.toHaveBeenCalled()
})
test("does not show unconfigured optional methods", async () => {
  mockApi("GET /login/methods", {
    social_providers: [],
    passkeys: false,
    registration: true,
  })
  expect((await mountSuspended(Options)).findAll("button")).toHaveLength(0)
  expect((await mountSuspended(Methods)).text()).toBe("")
})
test("registers, renames and removes passkeys through the generated SDK", async () => {
  signIn()
  mockApi("GET /login/passkeys/", [key])
  mockApi("POST /login/passkeys/register/options", {
    ceremony_id: "ceremony",
    options: { challenge: "AQID" },
  })
  mockApi("POST /login/passkeys/register/verify", key)
  mockApi("PATCH /login/passkeys/key-1", { ...key, name: "Renamed" })
  mockApi("DELETE /login/passkeys/key-1", { msg: "Deleted" })
  startRegistration.mockResolvedValue({ id: "credential", response: {} })
  const wrapper = await mountSuspended(Methods)
  await flushPromises()
  await submitForm(wrapper, { name: "My key" })
  const registration = requests.find((request) =>
    request.url.endsWith("/register/verify"),
  )!
  expect(await registration.json()).toEqual({
    ceremony_id: "ceremony",
    name: "My key",
    credential: { id: "credential", response: {} },
  })
  expect(useAuthStore().loggedIn).toBe(false)
  expect(navigateTo).toHaveBeenCalledWith("/login")
  signIn()
  const nameInput = wrapper.find('input[aria-label="Passkey name"]')
  await nameInput.setValue("Renamed")
  await button(wrapper, "Save").trigger("click")
  await flushPromises()
  expect(await requests.find((r) => r.method === "PATCH")!.json()).toEqual({
    name: "Renamed",
  })
  await button(wrapper, "Remove").trigger("click")
  await flushPromises()
  expect(apiPaths()).toContain("DELETE /login/passkeys/key-1")
})
test("reports passkey errors and rejects an empty registration name", async () => {
  signIn()
  mockApi("GET /login/passkeys/", apiError(500))
  const wrapper = await mountSuspended(Methods)
  await flushPromises()
  expect(toastTitles()).toContain("Update error")
  await submitForm(wrapper)
  expect(apiPaths()).not.toContain("POST /login/passkeys/register/options")
})
test("links social identities and clears revoked sessions when unlinking", async () => {
  signIn()
  mockApi("GET /login/passkeys/", [])
  mockApi("DELETE /login/social/google", { msg: "Unlinked" })
  const auth = useAuthStore()
  const social = vi.spyOn(auth, "socialLogin").mockResolvedValue(undefined)
  const wrapper = await mountSuspended(Methods)
  await flushPromises()
  await button(wrapper, "Link google").trigger("click")
  expect(social).toHaveBeenCalledWith("google", true)
  await button(wrapper, "Unlink google").trigger("click")
  await flushPromises()
  await vi.waitFor(() => expect(auth.loggedIn).toBe(false))
  expect(navigateTo).toHaveBeenCalledWith("/login")
})
test("reauthentication requests password and TOTP, then clears the form", async () => {
  signIn({ totp: true })
  const auth = useAuthStore()
  auth.reauthenticationRequired = true
  mockApi("POST /login/reauth", sessionTokens())
  await mountSuspended(Reauthenticate)
  await vi.waitFor(() =>
    expect(body().find('[role="dialog"]').exists()).toBe(true),
  )
  await submitForm(body().find('[role="dialog"]'), {
    password: "password123",
    claim: "123456",
  })
  expect(await requests[0]!.json()).toEqual({
    password: "password123",
    claim: "123456",
  })
  expect(auth.reauthenticationRequired).toBe(false)
  expect(toastTitles()).toContain("Identity confirmed")
})
test("reauthentication failure leaves the dialog open", async () => {
  signIn()
  useAuthStore().reauthenticationRequired = true
  mockApi("POST /login/reauth", apiError(400))
  await mountSuspended(Reauthenticate)
  await vi.waitFor(() =>
    expect(body().find('[role="dialog"]').exists()).toBe(true),
  )
  await submitForm(body().find('[role="dialog"]'), { password: "wrong" })
  expect(useAuthStore().reauthenticationRequired).toBe(true)
  expect(toastTitles()).toContain("Authentication failed")
})
test("passwordless reauthentication returns to sign-in", async () => {
  signIn({ hashed_password: false })
  useAuthStore().reauthenticationRequired = true
  mockApi("POST /login/revoke", { msg: "Revoked" })
  await mountSuspended(Reauthenticate)
  await vi.waitFor(() => expect(button(body(), "Sign in again")).toBeDefined())
  await button(body(), "Sign in again").trigger("click")
  await flushPromises()
  expect(navigateTo).toHaveBeenCalledWith("/login")
})

test("conditional UI completes passkey authentication without blocking explicit methods", async () => {
  supportsAutofill.mockResolvedValue(true)
  const login = vi
    .spyOn(useAuthStore(), "passkeyLogin")
    .mockImplementation(async () => {
      signIn()
      return true
    })
  const wrapper = await mountSuspended(Options, {
    props: { conditional: true },
  })
  await flushPromises()
  expect(login).toHaveBeenCalledWith({
    autofill: true,
    signal: expect.any(AbortSignal),
  })
  expect(navigateTo).toHaveBeenCalledWith("/")
  wrapper.unmount()
  expect(cancelCeremony).toHaveBeenCalled()
})

test("conditional UI keeps TOTP and fallback methods available", async () => {
  supportsAutofill.mockResolvedValue(true)
  vi.spyOn(useAuthStore(), "passkeyLogin").mockImplementation(async () => {
    useTokenStore().setTokens({
      access_token: jwt({ totp: true, exp: 9999999999 }),
      refresh_token: null,
      token_type: "bearer",
    })
    return true
  })
  const wrapper = await mountSuspended(Options, {
    props: { conditional: true },
  })
  await flushPromises()
  expect(navigateTo).toHaveBeenCalledWith("/totp")
  expect(
    button(wrapper, "Sign in with a passkey").attributes("disabled"),
  ).toBeUndefined()
  wrapper.unmount()
})

test("changing sign-in method aborts a pending autofill operation", async () => {
  supportsAutofill.mockResolvedValue(true)
  let resolveLogin!: (result: boolean) => void
  let signal!: AbortSignal
  vi.spyOn(useAuthStore(), "passkeyLogin").mockImplementation(
    async (options) => {
      signal = options!.signal!
      return new Promise<boolean>((resolve) => {
        resolveLogin = resolve
      })
    },
  )
  vi.spyOn(useAuthStore(), "socialLogin").mockResolvedValue(undefined)
  const wrapper = await mountSuspended(Options, {
    props: { conditional: true },
  })
  await flushPromises()
  await button(wrapper, "Continue with google").trigger("click")
  expect(signal.aborted).toBe(true)
  resolveLogin(true)
  await flushPromises()
  expect(navigateTo).not.toHaveBeenCalled()
  wrapper.unmount()
})

test("unsupported browsers explain passkey availability", async () => {
  supportsWebAuthn.mockReturnValue(false)
  const wrapper = await mountSuspended(Options, {
    props: { conditional: true },
  })
  await flushPromises()
  expect(
    button(wrapper, "Sign in with a passkey").attributes("disabled"),
  ).toBeDefined()
  expect(wrapper.text()).toContain("This browser does not support passkeys")
  expect(
    button(wrapper, "Continue with google").attributes("disabled"),
  ).toBeUndefined()
  wrapper.unmount()
})

test("autofill detection failures leave the page usable", async () => {
  supportsAutofill.mockRejectedValue(new Error("Unsupported"))
  const wrapper = await mountSuspended(Options, {
    props: { conditional: true },
  })
  await flushPromises()
  expect(button(wrapper, "Sign in with a passkey").exists()).toBe(true)
  wrapper.unmount()
})

test("does not start autofill after leaving the login page", async () => {
  let resolveSupport!: (value: boolean) => void
  supportsAutofill.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        resolveSupport = resolve
      }),
  )
  const login = vi.spyOn(useAuthStore(), "passkeyLogin")
  login.mockClear()
  const wrapper = await mountSuspended(Options, {
    props: { conditional: true },
  })
  wrapper.unmount()
  resolveSupport(true)
  await flushPromises()
  expect(login).not.toHaveBeenCalled()
})

test("cancelling passkey creation keeps the current session", async () => {
  signIn()
  mockApi("GET /login/passkeys/", [])
  mockApi("POST /login/passkeys/register/options", {
    ceremony_id: "ceremony",
    options: { challenge: "AQID" },
  })
  startRegistration.mockRejectedValue(
    new DOMException("Cancelled", "NotAllowedError"),
  )
  const wrapper = await mountSuspended(Methods)
  await submitForm(wrapper, { name: "Laptop" })
  expect(useAuthStore().loggedIn).toBe(true)
  expect(toastTitles()).toHaveLength(0)
  expect(apiPaths()).not.toContain("POST /login/passkeys/register/verify")
  wrapper.unmount()
})
