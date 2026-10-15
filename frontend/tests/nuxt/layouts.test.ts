import { mountSuspended } from "@nuxt/test-utils/runtime"
import type { DOMWrapper } from "@vue/test-utils"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, test, vi } from "vitest"
import App from "~/app.vue"
import ErrorPage from "~/error.vue"
import AuthenticationLayout from "~/layouts/authentication.vue"
import BpmnLayout from "~/layouts/bpmn.vue"
import DashboardLayout from "~/layouts/dashboard.vue"
import DefaultLayout from "~/layouts/default.vue"
import DocsLayout from "~/layouts/docs.vue"
import { apiPaths, mockApi, resetApp, signIn, user } from "./helpers"

const slots = { default: () => "Page content" }
const hrefs = (wrapper: { findAll: (s: string) => DOMWrapper<Element>[] }) =>
  wrapper.findAll("a").map((a) => a.attributes("href"))

beforeEach(async () => {
  resetApp()
  await useNuxtApp().$i18n.setLocale("en")
})

describe("default layout", () => {
  test("wraps the page with header and footer", async () => {
    const wrapper = await mountSuspended(DefaultLayout, { slots })
    expect(wrapper.find("header").exists()).toBe(true)
    expect(wrapper.find("footer").exists()).toBe(true)
    expect(wrapper.text()).toContain("Page content")
  })
})

describe("dashboard layout", () => {
  test("shows the account links", async () => {
    signIn()
    const wrapper = await mountSuspended(DashboardLayout, { slots })
    expect(wrapper.text()).toContain("FastAPI Nuxt")
    expect(hrefs(wrapper)).toContain("/settings")
    expect(hrefs(wrapper)).not.toContain("/moderation")
    expect(wrapper.text()).toContain("Page content")
  })

  test("adds moderation for administrators", async () => {
    signIn({ is_superuser: true })
    const wrapper = await mountSuspended(DashboardLayout, { slots })
    expect(hrefs(wrapper)).toContain("/moderation")
  })
})

describe("authentication layout", () => {
  test("goes back in history, or home without history", async () => {
    const router = useRouter()
    const back = vi.spyOn(router, "back").mockImplementation(() => {})
    const push = vi.spyOn(router, "push").mockResolvedValue(undefined)
    const wrapper = await mountSuspended(AuthenticationLayout, { slots })
    expect(wrapper.text()).toContain("Page content")

    const length = vi.spyOn(window.history, "length", "get")
    length.mockReturnValue(3)
    await wrapper.find("button").trigger("click")
    expect(back).toHaveBeenCalledOnce()

    length.mockReturnValue(1)
    await wrapper.find("button").trigger("click")
    expect(push).toHaveBeenCalledWith("/")
    vi.restoreAllMocks()
  })
})

describe("bpmn layout", () => {
  test("links the diagram in the active locale", async () => {
    await useNuxtApp().$i18n.setLocale("it")
    const wrapper = await mountSuspended(BpmnLayout, {
      slots,
      route: "/it/bpmn-editor",
    })
    expect(wrapper.text()).toContain("Diagramma 1")
    expect(hrefs(wrapper)).toContain("/it/bpmn-editor")
    expect(wrapper.html()).not.toMatch(/<chat/i)
  })
})

describe("docs layout", () => {
  test("lists the docs navigation", async () => {
    const wrapper = await mountSuspended(DocsLayout, {
      slots,
      route: "/docs/getting-started",
    })
    await flushPromises()
    expect(wrapper.text()).toContain("Installation")
    expect(hrefs(wrapper)).toContain("/docs/getting-started/installation")
    expect(wrapper.text()).toContain("Page content")
  })
})

describe("app", () => {
  test("restores the session profile on load", async () => {
    signIn()
    mockApi("GET /users/me", { ...user, full_name: "Restored" })
    await mountSuspended(App, { route: "/contact" })
    expect(apiPaths()).toContain("GET /users/me")
    expect(useAuthStore().full_name).toBe("Restored")
  })
})

describe("error page", () => {
  test("shows the error with a link home", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: {
        error: {
          status: 404,
          statusCode: 404,
          statusText: "Page not found",
          statusMessage: "Page not found",
          message: "Page not found",
        } as never,
      },
    })
    expect(wrapper.text()).toContain("404")
    expect(wrapper.text()).toContain("Page not found")
    expect(hrefs(wrapper)).toContain("/")
  })
})
