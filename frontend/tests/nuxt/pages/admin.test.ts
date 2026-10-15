import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { DOMWrapper, flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, test, vi } from "vitest"
import Contact from "~/pages/contact.vue"
import Moderation from "~/pages/moderation.vue"
import {
  apiError,
  apiPaths,
  mockApi,
  requests,
  resetApp,
  signIn,
  submitForm,
  toastTitles,
  user,
} from "../helpers"

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport("navigateTo", () => navigateTo)

const other = {
  ...user,
  id: "user-2",
  email: "b@example.com",
  full_name: "Grace",
  is_active: false,
  hashed_password: false,
  email_validated: false,
}

beforeEach(() => {
  resetApp()
  navigateTo.mockReset()
})

describe("contact page", () => {
  test("sends the message and goes home", async () => {
    mockApi("POST /services/contact", { msg: "ok" })
    const wrapper = await mountSuspended(Contact, { route: "/contact" })
    await submitForm(wrapper, {
      email: "visitor@example.com",
      message: "Hello, I would like a demo.",
    })
    expect(await requests[0]!.json()).toEqual({
      email: "visitor@example.com",
      subject: "Website contact from: visitor@example.com",
      content: "Hello, I would like a demo.",
    })
    expect(requests[0]!.headers.get("Authorization")).toBeNull()
    expect(toastTitles()).toContain("Message sent")
    expect(navigateTo).toHaveBeenCalledWith("/")
  })

  test("keeps the visitor on the page when sending fails", async () => {
    mockApi("POST /services/contact", apiError(429))
    const wrapper = await mountSuspended(Contact, { route: "/contact" })
    await submitForm(wrapper, {
      email: "visitor@example.com",
      message: "Hello, I would like a demo.",
    })
    expect(toastTitles()).toContain("Contact error")
    expect(navigateTo).not.toHaveBeenCalled()
  })

  test("validates the message length", async () => {
    const wrapper = await mountSuspended(Contact, { route: "/contact" })
    await submitForm(wrapper, { email: "visitor@example.com", message: "Hi" })
    expect(requests).toHaveLength(0)
  })
})

describe("moderation page", () => {
  async function mountModeration() {
    signIn({ is_superuser: true })
    mockApi("GET /users/", [user, other])
    const wrapper = await mountSuspended(Moderation, { route: "/moderation" })
    await flushPromises()
    return wrapper
  }
  const row = (
    wrapper: { findAll: (s: string) => DOMWrapper<Element>[] },
    email: string,
  ) => wrapper.findAll("tbody tr").find((tr) => tr.text().includes(email))!

  test("lists the users with their state", async () => {
    const wrapper = await mountModeration()
    expect(wrapper.text()).toContain("Ada")
    expect(wrapper.text()).toContain("b@example.com")
    expect(row(wrapper, "b@example.com").text()).toContain("No")
  })

  test("reports when the users cannot be loaded", async () => {
    signIn({ is_superuser: true })
    mockApi("GET /users/", apiError(500))
    await mountSuspended(Moderation, { route: "/moderation" })
    await flushPromises()
    expect(toastTitles()).toContain("Update error")
  })

  test("toggles the active state", async () => {
    const wrapper = await mountModeration()
    mockApi("POST /users/toggle-state", { msg: "Toggled" })
    await row(wrapper, "b@example.com")
      .findAll('[role="switch"]')[0]!
      .trigger("click")
    await flushPromises()
    expect(await requests.at(-1)!.json()).toEqual({
      user_email: "b@example.com",
    })
    expect(
      row(wrapper, "b@example.com")
        .find('[role="switch"]')
        .attributes("aria-checked"),
    ).toBe("true")
  })

  test("restores the switch when the update fails", async () => {
    const wrapper = await mountModeration()
    mockApi("POST /users/toggle-state", apiError(403))
    await row(wrapper, "b@example.com")
      .findAll('[role="switch"]')[0]!
      .trigger("click")
    await flushPromises()
    expect(
      row(wrapper, "b@example.com")
        .find('[role="switch"]')
        .attributes("aria-checked"),
    ).toBe("false")
    expect(toastTitles()).toContain("Update error")
  })

  test("promotes a user to moderator and reverts on error", async () => {
    const wrapper = await mountModeration()
    mockApi("POST /users/user-2", other)
    const moderatorSwitch = () =>
      row(wrapper, "b@example.com").findAll('[role="switch"]')[1]!
    await moderatorSwitch().trigger("click")
    await flushPromises()
    expect(await requests.at(-1)!.json()).toEqual({ is_superuser: true })
    expect(moderatorSwitch().attributes("aria-checked")).toBe("true")

    mockApi("POST /users/user-2", apiError(400))
    await moderatorSwitch().trigger("click")
    await flushPromises()
    expect(moderatorSwitch().attributes("aria-checked")).toBe("true")
  })

  test("creates a user and refreshes the list", async () => {
    const wrapper = await mountModeration()
    mockApi("POST /users/create", {
      ...other,
      id: "user-3",
      email: "c@example.com",
    })
    const button = wrapper
      .findAll("button")
      .find((b) => b.text().includes("New user"))!
    await button.trigger("click")
    const modal = await vi.waitFor(() => {
      const dialog = new DOMWrapper(document.body).find('[role="dialog"]')
      expect(dialog.exists()).toBe(true)
      return dialog
    })
    mockApi("GET /users/", [
      user,
      other,
      { ...other, id: "user-3", email: "c@example.com" },
    ])
    await submitForm(modal, { full_name: "Linus", email: "c@example.com" })
    const created = requests.find((r) => r.url.endsWith("/users/create"))!
    expect(await created.json()).toMatchObject({
      email: "c@example.com",
      full_name: "Linus",
      password: expect.stringMatching(/^[0-9a-f-]{36}$/),
    })
    expect(toastTitles()).toContain("User created")
    await vi.waitFor(() => expect(wrapper.text()).toContain("c@example.com"))
    expect(apiPaths().filter((p) => p === "GET /users/")).toHaveLength(2)
  })
})
