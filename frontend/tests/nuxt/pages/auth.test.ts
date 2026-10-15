import {
  mockComponent,
  mockNuxtImport,
  mountSuspended,
} from "@nuxt/test-utils/runtime"
import type { DOMWrapper } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import Login from "~/pages/(auth)/login.vue"
import Magic from "~/pages/(auth)/magic.vue"
import RecoverPassword from "~/pages/(auth)/recover-password.vue"
import ResetPassword from "~/pages/(auth)/reset-password.vue"
import Signup from "~/pages/(auth)/signup.vue"
import Totp from "~/pages/(auth)/totp.vue"
import {
  apiError,
  apiPaths as allApiPaths,
  jwt,
  mockApi,
  requests as recordedRequests,
  resetApp,
  sessionTokens,
  submitForm,
  toastTitles,
  user,
} from "../helpers"

mockComponent("AuthenticationOptions", {
  template: "<div />",
  methods: {
    cancel() {
      cancelPasskey()
    },
  },
})

const authRequests = () =>
  recordedRequests.filter((request) => !request.url.endsWith("/login/methods"))
const apiPaths = () =>
  allApiPaths().filter((path) => path !== "GET /login/methods")

const { navigateTo, cancelPasskey } = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  cancelPasskey: vi.fn(),
}))
mockNuxtImport("navigateTo", () => navigateTo)

const totpChallenge = () =>
  jwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60, totp: true })
const challengeTokens = () => ({
  access_token: totpChallenge(),
  refresh_token: null,
  token_type: "bearer",
})

const pinInputs = (wrapper: {
  findAll: (selector: string) => DOMWrapper<Element>[]
}) => wrapper.findAll('input:not([type="hidden"]):not([aria-hidden="true"])')

beforeEach(() => {
  resetApp()
  mockApi("GET /login/methods", {
    social_providers: [],
    passkeys: false,
    registration: true,
  })
  navigateTo.mockReset()
  cancelPasskey.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})

describe.each([
  ["login", Login],
  ["signup", Signup],
])("%s page", (name, Page) => {
  test("asks only for the email by default", async () => {
    const wrapper = await mountSuspended(Page, { route: `/${name}` })
    expect(wrapper.find('[name="email"]').exists()).toBe(true)
    if (name === "login")
      expect(wrapper.find('[name="email"]').attributes("autocomplete")).toBe(
        "username webauthn",
      )
    expect(wrapper.find('[name="password"]').exists()).toBe(false)
    expect(wrapper.text()).toContain("Terms of Service")
  })

  test("sends a magic link and moves to the check-email page", async () => {
    mockApi("POST /login/magic/a%40example.com", {
      claim: jwt({ fingerprint: "fp-1" }),
    })
    const wrapper = await mountSuspended(Page, { route: `/${name}` })
    await submitForm(wrapper, { email: user.email })
    expect(apiPaths()).toEqual(["POST /login/magic/a%40example.com"])
    expect(navigateTo).toHaveBeenCalledWith("/magic")
    if (name === "login") expect(cancelPasskey).toHaveBeenCalledOnce()
  })

  test("moves to the TOTP page when a second factor is required", async () => {
    mockApi("POST /login/signup", user)
    mockApi("POST /login/oauth", challengeTokens())
    const wrapper = await mountSuspended(Page, { route: `/${name}?oauth=1` })
    await submitForm(wrapper, { email: user.email, password: "password123" })
    expect(navigateTo).toHaveBeenCalledWith("/totp")
  })

  test("does not submit an invalid email", async () => {
    const wrapper = await mountSuspended(Page, { route: `/${name}` })
    await submitForm(wrapper, { email: "not-an-email" })
    expect(authRequests()).toHaveLength(0)
    expect(wrapper.text()).toContain("Invalid email")
  })

  test("stays on the page when the login fails", async () => {
    mockApi("POST /login/magic/a%40example.com", apiError(429))
    const wrapper = await mountSuspended(Page, { route: `/${name}` })
    await submitForm(wrapper, { email: user.email })
    expect(navigateTo).not.toHaveBeenCalled()
    expect(toastTitles()).toContain("Login error")
  })
})

describe("login page", () => {
  test("logs in with a password", async () => {
    mockApi("POST /login/oauth", sessionTokens())
    mockApi("GET /users/me", user)
    const wrapper = await mountSuspended(Login, { route: "/login?oauth=true" })
    await submitForm(wrapper, { email: user.email, password: "password123" })
    expect(apiPaths()).toEqual(["POST /login/oauth", "GET /users/me"])
    expect(navigateTo).toHaveBeenCalledWith("/")
    expect(useAuthStore().loggedIn).toBe(true)
  })

  test("requires a password of at least 8 characters", async () => {
    const wrapper = await mountSuspended(Login, { route: "/login?oauth=true" })
    await submitForm(wrapper, { email: user.email, password: "short" })
    expect(authRequests()).toHaveLength(0)
  })
})

describe("signup page", () => {
  test("creates the account before logging in with a password", async () => {
    mockApi("POST /login/signup", user)
    mockApi("POST /login/oauth", sessionTokens())
    mockApi("GET /users/me", user)
    const wrapper = await mountSuspended(Signup, { route: "/signup?oauth=1" })
    await submitForm(wrapper, { email: user.email, password: "password123" })
    expect(apiPaths()).toEqual([
      "POST /login/signup",
      "POST /login/oauth",
      "GET /users/me",
    ])
    expect(await authRequests()[0]!.json()).toEqual({
      email: user.email,
      password: "password123",
    })
    expect(navigateTo).toHaveBeenCalledWith("/")
  })

  test("sends to login when the email must be confirmed first", async () => {
    mockApi("POST /login/signup", { msg: "Check your email" })
    const wrapper = await mountSuspended(Signup, { route: "/signup?oauth=1" })
    await submitForm(wrapper, { email: user.email, password: "password123" })
    expect(apiPaths()).toEqual(["POST /login/signup"])
    expect(navigateTo).toHaveBeenCalledWith("/login")
  })

  test("reports a failed signup without logging in", async () => {
    mockApi("POST /login/signup", apiError(400))
    const wrapper = await mountSuspended(Signup, { route: "/signup?oauth=1" })
    await submitForm(wrapper, { email: user.email, password: "password123" })
    expect(apiPaths()).toEqual(["POST /login/signup"])
    expect(toastTitles()).toContain("Sign up error")
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe("totp page", () => {
  test("sends home a visitor without a TOTP challenge", async () => {
    await mountSuspended(Totp, { route: "/totp" })
    expect(navigateTo).toHaveBeenCalledWith("/")
  })

  test("completes the login with the six-digit code", async () => {
    useTokenStore().setTokens(challengeTokens())
    mockApi("POST /login/totp", sessionTokens())
    mockApi("GET /users/me", user)
    const wrapper = await mountSuspended(Totp, { route: "/totp" })
    expect(navigateTo).not.toHaveBeenCalled()
    const inputs = pinInputs(wrapper)
    expect(inputs).toHaveLength(6)
    for (const [index, input] of inputs.entries())
      await input.setValue(String(index + 1))
    await submitForm(wrapper)
    expect(await authRequests()[0]!.json()).toEqual({ claim: "123456" })
    expect(navigateTo).toHaveBeenCalledWith("/")
  })

  test("stays on the page with a wrong code", async () => {
    useTokenStore().setTokens(challengeTokens())
    mockApi("POST /login/totp", apiError(400))
    const wrapper = await mountSuspended(Totp, { route: "/totp" })
    for (const input of pinInputs(wrapper)) await input.setValue("0")
    await submitForm(wrapper)
    expect(toastTitles()).toContain("Two-factor error")
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe("magic page", () => {
  test("explains the magic link when a claim is stored", async () => {
    useTokenStore().setMagicToken({ claim: jwt({ fingerprint: "fp-1" }) })
    const wrapper = await mountSuspended(Magic, { route: "/magic" })
    expect(wrapper.text()).toContain("Check your email")
    expect(navigateTo).not.toHaveBeenCalled()
  })

  test.each([
    ["no token", ""],
    ["a session token", sessionTokens().access_token],
  ])("sends to login with %s", async (_, token) => {
    useTokenStore().setMagicToken({ claim: token })
    await mountSuspended(Magic, { route: "/magic" })
    expect(navigateTo).toHaveBeenCalledWith("/login")
  })
})

describe("recover password page", () => {
  test("requests a recovery email and goes home", async () => {
    mockApi("POST /login/recover/a%40example.com", {
      claim: jwt({ fingerprint: "fp-1" }),
    })
    const wrapper = await mountSuspended(RecoverPassword, {
      route: "/recover-password",
    })
    vi.useFakeTimers({ toFake: ["setTimeout"] })
    await submitForm(wrapper, { email: user.email })
    expect(apiPaths()).toEqual(["POST /login/recover/a%40example.com"])
    expect(navigateTo).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2000)
    expect(navigateTo).toHaveBeenCalledWith("/")
  })
})

describe("reset password page", () => {
  test("sends home a visitor without a token", async () => {
    await mountSuspended(ResetPassword, { route: "/reset-password" })
    expect(navigateTo).toHaveBeenCalledWith("/")
  })

  test("resets the password with the emailed token", async () => {
    const emailed = jwt({ sub: "user-1", fingerprint: "fp-1" })
    useTokenStore().setMagicToken({ claim: jwt({ fingerprint: "fp-1" }) })
    mockApi("POST /login/reset", { msg: "Password updated" })
    const wrapper = await mountSuspended(ResetPassword, {
      route: `/reset-password?token=${emailed}`,
    })
    vi.useFakeTimers({ toFake: ["setTimeout"] })
    await submitForm(wrapper, {
      password: "new-password",
      confirmation: "new-password",
    })
    expect(authRequests()[0]!.headers.get("Authorization")).toBe(
      `Bearer ${emailed}`,
    )
    await vi.advanceTimersByTimeAsync(2000)
    expect(navigateTo).toHaveBeenCalledWith("/login")
  })

  test("refuses passwords that do not match", async () => {
    const wrapper = await mountSuspended(ResetPassword, {
      route: "/reset-password?token=x",
    })
    await submitForm(wrapper, {
      password: "new-password",
      confirmation: "other-password",
    })
    expect(authRequests()).toHaveLength(0)
  })
})

test("TOTP recovery mode exchanges a recovery code", async () => {
  useTokenStore().setTokens(challengeTokens())
  mockApi("POST /login/totp/recover", sessionTokens())
  mockApi("GET /users/me", user)
  const wrapper = await mountSuspended(Totp, { route: "/totp" })
  await wrapper
    .findAll("button")
    .find((b) => b.text() === "Use a recovery code")!
    .trigger("click")
  await submitForm(wrapper, { recoveryCode: "backup-code" })
  expect(await authRequests()[0]!.json()).toEqual({ claim: "backup-code" })
  expect(navigateTo).toHaveBeenCalledWith("/")
})
test("a failed password reset stays on the form", async () => {
  useTokenStore().setMagicToken({ claim: jwt({ fingerprint: "fp-1" }) })
  const wrapper = await mountSuspended(ResetPassword, {
    route: `/reset-password?token=${jwt({ fingerprint: "fp-2" })}`,
  })
  await submitForm(wrapper, {
    password: "new-password",
    confirmation: "new-password",
  })
  expect(navigateTo).not.toHaveBeenCalled()
})

test("closed registration hides signup and keeps the login available", async () => {
  mockApi("GET /login/methods", {
    social_providers: [],
    passkeys: false,
    registration: false,
  })
  const wrapper = await mountSuspended(Signup, { route: "/signup" })
  expect(wrapper.text()).toContain("Registration is closed")
  expect(wrapper.find("form").exists()).toBe(false)
})
