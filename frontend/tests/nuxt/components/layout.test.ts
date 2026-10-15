import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import type { DOMWrapper } from "@vue/test-utils"
import { beforeEach, describe, expect, test, vi } from "vitest"
import AnimatedBeamExample from "~/components/AnimatedBeamExample.vue"
import AuthenticationNavigation from "~/components/authentication/Navigation.vue"
import PageHeaderLinks from "~/components/content/PageHeaderLinks.vue"
import ImagePlaceholder from "~/components/ImagePlaceholder.vue"
import LayoutFooter from "~/components/layout/Footer.vue"
import LayoutHeader from "~/components/layout/Header.vue"
import LocaleDropdown from "~/components/locale/Dropdown.vue"
import DefaultOgImage from "~/components/OgImage/DefaultOgImage.takumi.vue"
import SafariMockup from "~/components/SafariMockup.vue"
import StarsBg from "~/components/StarsBg.vue"
import { resetApp, signIn } from "../helpers"

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport("navigateTo", () => navigateTo)

type MenuItem = { label: string; to?: string; onSelect?: () => unknown }
const menuItems = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  (
    wrapper.findComponent({ name: "UDropdownMenu" }).props("items") as
      | MenuItem[]
      | MenuItem[][]
  ).flat()
const hrefs = (wrapper: { findAll: (s: string) => DOMWrapper<Element>[] }) =>
  wrapper.findAll("a").map((a) => a.attributes("href"))

beforeEach(async () => {
  resetApp()
  navigateTo.mockReset()
  await useNuxtApp().$i18n.setLocale("en")
})

describe("header", () => {
  test("links every public section", async () => {
    const wrapper = await mountSuspended(LayoutHeader, { route: "/" })
    expect(wrapper.text()).toContain("FastAPI Nuxt")
    expect(hrefs(wrapper)).toEqual(
      expect.arrayContaining([
        "/",
        "/blog",
        "/pricing",
        "/changelog",
        "/contact",
        "/bpmn-editor",
      ]),
    )
  })

  test("localizes the links", async () => {
    await useNuxtApp().$i18n.setLocale("it")
    const wrapper = await mountSuspended(LayoutHeader, { route: "/it/blog" })
    expect(hrefs(wrapper)).toEqual(
      expect.arrayContaining(["/it/blog", "/it/contact"]),
    )
  })
})

describe("authentication navigation", () => {
  test("offers the login to visitors", async () => {
    const wrapper = await mountSuspended(AuthenticationNavigation)
    expect(wrapper.text()).toContain("Login")
    expect(hrefs(wrapper)).toContain("/login")
  })

  test("offers settings and logout to users", async () => {
    signIn()
    const wrapper = await mountSuspended(AuthenticationNavigation)
    expect(wrapper.text()).not.toContain("Login")
    const [settings, logout] = menuItems(wrapper)
    expect(settings!.label).toBe("Settings")
    expect(settings!.to).toBe("/settings")
    await logout!.onSelect!()
    expect(useAuthStore().loggedIn).toBe(false)
    expect(navigateTo).toHaveBeenCalledWith("/")
  })
})

describe("footer", () => {
  test("shows the privacy link and the locale selector", async () => {
    const wrapper = await mountSuspended(LayoutFooter)
    expect(wrapper.text()).toContain(String(new Date().getFullYear()))
    expect(hrefs(wrapper)).toContain("/privacy")
    expect(wrapper.findComponent(LocaleDropdown).exists()).toBe(true)
  })
})

describe("locale dropdown", () => {
  test("offers the configured locales and switches language", async () => {
    const wrapper = await mountSuspended(LocaleDropdown)
    const select = wrapper.findComponent({ name: "ULocaleSelect" })
    const codes = (select.props("locales") as { code: string }[]).map(
      (l) => l.code,
    )
    expect(codes.sort()).toEqual(["en", "it"])
    select.vm.$emit("update:modelValue", "it")
    await vi.waitFor(() => expect(useNuxtApp().$i18n.locale.value).toBe("it"))
  })
})

describe("page header links", () => {
  test("builds the Markdown and AI links for the page", async () => {
    const wrapper = await mountSuspended(PageHeaderLinks, {
      route: "/docs/getting-started",
    })
    const links = menuItems(wrapper).map((item) => item.to ?? "")
    expect(links).toContain("/raw/en/docs/getting-started.md")
    expect(links.some((to) => to.startsWith("https://claude.ai/new?q="))).toBe(
      true,
    )
    expect(links.some((to) => to.startsWith("https://chatgpt.com/"))).toBe(true)
  })

  test("copies the Markdown link and notifies", async () => {
    // jsdom has no ClipboardItem: VueUse falls back to execCommand("copy")
    Object.defineProperty(window.navigator, "clipboard", {
      value: { write: vi.fn() },
      configurable: true,
    })
    let copied = ""
    window.document.execCommand = vi.fn(() => {
      copied = window.document.querySelector("textarea")?.value ?? ""
      return true
    })
    const wrapper = await mountSuspended(PageHeaderLinks, {
      route: "/docs/getting-started",
    })
    await menuItems(wrapper)[0]!.onSelect!()
    await flushPromises()
    await vi.waitFor(() =>
      expect(copied).toMatch(/\/raw\/docs\/getting-started\.md$/),
    )
    expect(useToast().toasts.value.map((t) => t.title)).toContain(
      "Copied to clipboard",
    )
  })
})

describe("decorative components", () => {
  test("render without errors", async () => {
    const placeholder = await mountSuspended(ImagePlaceholder, {
      slots: { default: () => "Slot content" },
    })
    expect(placeholder.text()).toContain("Slot content")
    const mockup = await mountSuspended(SafariMockup, {
      props: { url: "example.com", src: "/image.webp" },
    })
    expect(mockup.text()).toContain("example.com")
    expect(mockup.find('image[href="/image.webp"]').exists()).toBe(true)
    const stars = await mountSuspended(StarsBg, {
      props: { starCount: 10, speed: "fast" },
    })
    expect(stars.findAll(".star").length).toBeGreaterThan(0)
    const beams = await mountSuspended(AnimatedBeamExample)
    expect(beams.findAll("svg path").length).toBeGreaterThan(0)
    const og = await mountSuspended(DefaultOgImage, {
      props: { title: "Hello", description: "World" },
    })
    expect(og.text()).toContain("Hello")
  })
})
