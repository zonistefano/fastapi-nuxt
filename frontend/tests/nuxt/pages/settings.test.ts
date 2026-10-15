import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { DOMWrapper, flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, test, vi } from "vitest"
import Settings from "~/pages/settings.vue"
import Profile from "~/pages/settings/index.vue"
import Security from "~/pages/settings/security.vue"
import {
  apiError,
  apiPaths,
  mockApi,
  requests,
  resetApp,
  sessionTokens,
  signIn,
  submitForm,
  toastTitles,
  user,
} from "../helpers"

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport("navigateTo", () => navigateTo)

const body = () => new DOMWrapper(document.body)

beforeEach(() => {
  resetApp()
  navigateTo.mockReset()
})

describe("settings page", () => {
  test("renders the dashboard panel with its title", async () => {
    signIn()
    const wrapper = await mountSuspended(Settings, { route: "/settings" })
    expect(wrapper.text()).toContain("Settings")
  })
})

describe("profile settings", () => {
  test("updates name and email after confirming the password", async () => {
    signIn()
    mockApi("PUT /users/me", { ...user, full_name: "Grace" })
    const wrapper = await mountSuspended(Profile)
    await submitForm(wrapper, { name: "Grace", original: "password123" })
    expect(await requests[0]!.json()).toEqual({
      original: "password123",
      email: user.email,
      full_name: "Grace",
    })
    expect(useAuthStore().full_name).toBe("Grace")
    expect(toastTitles()).toContain("Profile update")
  })

  test("requires the current password when the account has one", async () => {
    signIn()
    const wrapper = await mountSuspended(Profile)
    await submitForm(wrapper, { name: "Grace" })
    expect(requests).toHaveLength(0)
  })

  test("does not ask for a password on passwordless accounts", async () => {
    signIn({ hashed_password: false })
    mockApi("PUT /users/me", user)
    const wrapper = await mountSuspended(Profile)
    expect(wrapper.find("#original").exists()).toBe(false)
    await submitForm(wrapper, { name: "Grace" })
    expect(await requests[0]!.json()).toEqual({
      email: user.email,
      full_name: "Grace",
    })
  })

  test("logs out after changing the email", async () => {
    signIn()
    mockApi("PUT /users/me", { ...user, email: "new@example.com" })
    const wrapper = await mountSuspended(Profile)
    await submitForm(wrapper, {
      email: "new@example.com",
      original: "password123",
    })
    expect(navigateTo).toHaveBeenCalledWith("/login")
    expect(useAuthStore().loggedIn).toBe(false)
  })

  test("offers email validation only to unvalidated accounts", async () => {
    signIn()
    expect((await mountSuspended(Profile)).text()).not.toContain("Send email")

    signIn({ email_validated: false })
    mockApi("POST /users/send-validation-email", { msg: "Sent" })
    const wrapper = await mountSuspended(Profile)
    const button = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Send email"))!
    await button.trigger("click")
    await flushPromises()
    expect(apiPaths()).toEqual(["POST /users/send-validation-email"])
    expect(toastTitles()).toContain("Validation sent")
  })
})

describe("security settings", () => {
  test("changes the password and logs out", async () => {
    signIn()
    mockApi("PUT /users/me", user)
    const wrapper = await mountSuspended(Security)
    await submitForm(wrapper, {
      original: "password123",
      password: "new-password",
      confirmation: "new-password",
    })
    expect(await requests[0]!.json()).toEqual({
      original: "password123",
      password: "new-password",
    })
    expect(navigateTo).toHaveBeenCalledWith("/login")
  })

  test("refuses a confirmation that does not match", async () => {
    signIn()
    const wrapper = await mountSuspended(Security)
    await submitForm(wrapper, {
      original: "password123",
      password: "new-password",
      confirmation: "different-password",
    })
    expect(requests).toHaveLength(0)
  })

  test("enables two-factor authentication and shows the recovery codes", async () => {
    signIn()
    mockApi("POST /login/new-totp", { key: "SECRETKEY", uri: "otpauth://x" })
    mockApi("PUT /login/totp", {
      msg: "Enabled",
      tokens: sessionTokens(),
      recovery_codes: ["code-1", "code-2"],
    })
    const wrapper = await mountSuspended(Security)
    await wrapper.find('[role="switch"]').trigger("click")
    await submitForm(wrapper, { original: "password123" })
    expect(apiPaths()).toEqual(["POST /login/new-totp"])
    await vi.waitFor(() => expect(body().text()).toContain("SECRETKEY"))

    const modal = body().find('[role="dialog"]')
    await submitForm(modal, { claim: "123456" })
    expect(await requests[1]!.json()).toEqual({
      claim: "123456",
      uri: "otpauth://x",
      password: "password123",
    })
    await vi.waitFor(() => expect(body().text()).toContain("code-2"))
    expect(useAuthStore().totp_secret).toBe(true)
  })

  test("reports when a new TOTP secret cannot be created", async () => {
    signIn()
    mockApi("POST /login/new-totp", apiError(500))
    const wrapper = await mountSuspended(Security)
    await wrapper.find('[role="switch"]').trigger("click")
    await submitForm(wrapper, { original: "password123" })
    expect(toastTitles()).toContain("Error enabling two-factor authentication")
  })

  test("disables two-factor authentication", async () => {
    signIn({ totp: true })
    mockApi("DELETE /login/totp", { msg: "Disabled", tokens: sessionTokens() })
    const wrapper = await mountSuspended(Security)
    await wrapper.find('[role="switch"]').trigger("click")
    await submitForm(wrapper, { original: "password123" })
    expect(apiPaths()).toEqual(["DELETE /login/totp"])
    expect(useAuthStore().totp_secret).toBe(false)
  })
})
