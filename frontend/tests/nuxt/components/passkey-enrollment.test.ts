import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import type { VueWrapper } from "@vue/test-utils"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import Enrollment from "~/components/authentication/PasskeyEnrollment.vue"
import {
  apiError,
  apiPaths,
  mockApi,
  resetApp,
  signIn,
  toastTitles,
} from "../helpers"

const { supported } = vi.hoisted(() => ({ supported: vi.fn(() => true) }))
vi.mock("@simplewebauthn/browser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@simplewebauthn/browser")>()),
  browserSupportsWebAuthn: supported,
}))

let wrapper: VueWrapper
beforeEach(async () => {
  resetApp()
  localStorage.clear()
  supported.mockReturnValue(true)
  useAppConfig().auth.passkeyEnrollment.enabled = true
  useAppConfig().auth.passkeyEnrollment.cooldownDays = 30
  mockApi("GET /login/methods", {
    social_providers: [],
    passkeys: true,
    registration: true,
  })
  mockApi("GET /login/passkeys/", [])
  await useNuxtApp().$i18n.setLocale("en")
})
afterEach(() => {
  wrapper?.unmount()
  useAppConfig().auth.passkeyEnrollment.enabled = false
})

async function invite() {
  signIn()
  useAuthStore().passkeyEnrollmentPending = true
  await flushPromises()
}

test("invites only after a new completed login and defers dismissal for 30 days", async () => {
  signIn()
  wrapper = await mountSuspended(Enrollment)
  expect(wrapper.text()).toBe("")
  expect(apiPaths()).toHaveLength(0)
  await invite()
  expect(wrapper.text()).toContain("Want to sign in faster next time?")
  expect(useAuthStore().passkeyEnrollmentPending).toBe(false)
  const before = Date.now()
  await wrapper
    .findAll("button")
    .find((b) => b.text() === "Not now")!
    .trigger("click")
  expect(wrapper.text()).toBe("")
  expect(
    Number(localStorage.getItem("passkey-enrollment:user-1")),
  ).toBeGreaterThanOrEqual(before + 30 * 86_400_000)
  await invite()
  expect(wrapper.text()).toBe("")
})

test("closing the banner applies the cooldown and another account has its own preference", async () => {
  wrapper = await mountSuspended(Enrollment)
  await invite()
  const close = wrapper.find("button[aria-label]")
  expect(close.exists(), wrapper.html()).toBe(true)
  await close.trigger("click")
  expect(localStorage.getItem("passkey-enrollment:user-1")).not.toBeNull()
  signIn({ id: "user-2" })
  useAuthStore().passkeyEnrollmentPending = true
  await flushPromises()
  expect(wrapper.text()).toContain("Want to sign in faster next time?")
})

test("the creation action opens localized security settings and dismisses the invitation", async () => {
  await useNuxtApp().$i18n.setLocale("it")
  wrapper = await mountSuspended(Enrollment, { route: "/it/contact" })
  await invite()
  const link = wrapper.find("a")
  expect(link.text()).toBe("Crea passkey")
  expect(link.attributes("href")).toBe("/it/settings/security#passkeys")
  await link.trigger("click")
  expect(wrapper.text()).toBe("")
  expect(localStorage.getItem("passkey-enrollment:user-1")).not.toBeNull()
})

test.each([
  "disabled",
  "unsupported",
  "method-disabled",
  "existing",
  "error",
  "cooldown",
])("skips enrollment when %s", async (reason) => {
  if (reason === "disabled")
    useAppConfig().auth.passkeyEnrollment.enabled = false
  if (reason === "unsupported") supported.mockReturnValue(false)
  if (reason === "method-disabled")
    mockApi("GET /login/methods", { passkeys: false })
  if (reason === "existing") mockApi("GET /login/passkeys/", [{ id: "key-1" }])
  if (reason === "error") mockApi("GET /login/passkeys/", apiError(500))
  if (reason === "cooldown")
    localStorage.setItem(
      "passkey-enrollment:user-1",
      String(Date.now() + 100_000),
    )
  wrapper = await mountSuspended(Enrollment)
  await invite()
  expect(wrapper.text()).toBe("")
  expect(useAuthStore().loggedIn).toBe(true)
  expect(toastTitles()).toHaveLength(0)
})

test("expired cooldown allows another invitation and logout hides it", async () => {
  localStorage.setItem("passkey-enrollment:user-1", String(Date.now() - 1))
  wrapper = await mountSuspended(Enrollment)
  await invite()
  expect(wrapper.text()).toContain("Want to sign in faster next time?")
  useAuthStore().clearSession()
  await flushPromises()
  expect(wrapper.text()).toBe("")
})

test.each(["logout", "switch", "unmount"])(
  "ignores an invitation response after %s",
  async (action) => {
    let resolve!: (response: Response) => void
    mockApi(
      "GET /login/passkeys/",
      () =>
        new Promise<Response>((done) => {
          resolve = done
        }),
    )
    wrapper = await mountSuspended(Enrollment)
    await invite()
    if (action === "logout") useAuthStore().clearSession()
    if (action === "switch") signIn({ id: "user-2" })
    if (action === "unmount") wrapper.unmount()
    await flushPromises()
    resolve(Response.json([]))
    await flushPromises()
    expect(wrapper.text()).toBe("")
  },
)
