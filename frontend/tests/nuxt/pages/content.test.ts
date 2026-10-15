import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, test, vi } from "vitest"
import CatchAll from "~/pages/[...slug].vue"
import BlogPost from "~/pages/blog/[...slug].vue"
import Blog from "~/pages/blog/index.vue"
import Changelog from "~/pages/changelog.vue"
import Docs from "~/pages/docs/[...slug].vue"
import Index from "~/pages/index.vue"
import Pricing from "~/pages/pricing.vue"
import { collections } from "../content"
import { jwt, mockApi, resetApp, sessionTokens, user } from "../helpers"

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport("navigateTo", () => navigateTo)
// A fatal Nuxt error would replace the test app with the error page
mockNuxtImport(
  "createError",
  () => (error: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(error.statusMessage), error),
)

type Page = Record<string, never>
const first = (collection: string) =>
  collections.get(collection)![0] as unknown as Record<string, Page>

beforeEach(async () => {
  resetApp()
  navigateTo.mockReset()
  await useNuxtApp().$i18n.setLocale("en")
})

describe("home page", () => {
  test("renders every section of the home content", async () => {
    const page = first("index_en")
    const wrapper = await mountSuspended(Index, { route: "/" })
    const text = wrapper.text()
    expect(text).toContain(page.hero!.description)
    for (const section of page.sections as unknown as Page[])
      expect(text).toContain(section.title)
    expect(text).toContain(page.features!.title)
    expect(text).toContain(page.testimonials!.title)
    expect(text).toContain("Connect everything")
  })

  test("uses the content of the active locale", async () => {
    await useNuxtApp().$i18n.setLocale("it")
    const wrapper = await mountSuspended(Index, { route: "/it" })
    expect(wrapper.text()).toContain(first("index_it").hero!.description)
  })

  test("completes a magic-link login from the email", async () => {
    const claim = jwt({ fingerprint: "fp-1" })
    useTokenStore().setMagicToken({ claim })
    mockApi("POST /login/claim", sessionTokens())
    mockApi("GET /users/me", user)
    const emailed = jwt({ sub: "user-1", fingerprint: "fp-1" })
    await mountSuspended(Index, { route: `/?magic=${emailed}` })
    await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith("/"))
    expect(useAuthStore().loggedIn).toBe(true)
  })

  test("sends to the TOTP page when the magic link needs a second factor", async () => {
    useTokenStore().setMagicToken({ claim: jwt({ fingerprint: "fp-1" }) })
    mockApi("POST /login/claim", {
      access_token: jwt({ sub: "user-1", exp: 9999999999, totp: true }),
      refresh_token: null,
      token_type: "bearer",
    })
    await mountSuspended(Index, {
      route: `/?magic=${jwt({ fingerprint: "fp-1" })}`,
    })
    await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith("/totp"))
  })

  test("goes home after an invalid magic link", async () => {
    await mountSuspended(Index, {
      route: `/?magic=${jwt({ fingerprint: "x" })}`,
    })
    await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith("/"))
    expect(useAuthStore().loggedIn).toBe(false)
  })
})

describe("pricing page", () => {
  test("switches the plans between monthly and yearly prices", async () => {
    const plans = first("pricing_en").plans as unknown as {
      title: string
      price: { month: string; year: string }
    }[]
    const wrapper = await mountSuspended(Pricing, { route: "/pricing" })
    for (const plan of plans) expect(wrapper.text()).toContain(plan.title)
    expect(wrapper.text()).toContain(plans[0]!.price.month)
    expect(wrapper.text()).toContain("/month")

    const yearly = wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text() === "Yearly")!
    await yearly.trigger("mousedown", { button: 0 })
    await yearly.trigger("click")
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain(plans[0]!.price.year),
    )
    expect(wrapper.text()).toContain("/year")
  })
})

describe("blog", () => {
  test("lists the posts with their dates", async () => {
    const wrapper = await mountSuspended(Blog, { route: "/blog" })
    expect(wrapper.text()).toContain("First post")
    expect(wrapper.text()).toContain("Second post")
    expect(wrapper.find('time[datetime^="2026-01-10"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/blog/first"]').exists()).toBe(true)
  })

  test("uses the Italian posts and links", async () => {
    await useNuxtApp().$i18n.setLocale("it")
    const wrapper = await mountSuspended(Blog, { route: "/it/blog" })
    expect(wrapper.text()).toContain("Articoli recenti")
    expect(wrapper.find('a[href="/it/blog/first"]').exists()).toBe(true)
  })

  test("renders a post with its authors and neighbours", async () => {
    const wrapper = await mountSuspended(BlogPost, { route: "/blog/first" })
    expect(wrapper.text()).toContain("First post")
    expect(wrapper.text()).toContain("First post body")
    expect(wrapper.text()).toContain("Ada")
    expect(wrapper.find('a[href="/blog/second"]').exists()).toBe(true)
  })

  test("rejects an unknown post", async () => {
    await expect(
      mountSuspended(BlogPost, { route: "/blog/missing" }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe("docs", () => {
  test("renders a page with its table of contents and neighbours", async () => {
    const wrapper = await mountSuspended(Docs, {
      route: "/docs/getting-started",
    })
    expect(wrapper.text()).toContain("Introduction")
    expect(wrapper.text()).toContain("Introduction body")
    expect(wrapper.text()).toContain("Intro")
    expect(
      wrapper.find('a[href="/docs/getting-started/installation"]').exists(),
    ).toBe(true)
  })

  test("rejects an unknown page", async () => {
    await expect(
      mountSuspended(Docs, { route: "/docs/missing" }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe("changelog", () => {
  test("lists the newest version first", async () => {
    const wrapper = await mountSuspended(Changelog, { route: "/changelog" })
    const text = wrapper.text()
    expect(text.indexOf("Teams")).toBeLessThan(text.indexOf("Launch"))
    expect(text).toContain("Launch notes")
  })
})

describe("generic content pages", () => {
  test("renders a Markdown page by path", async () => {
    const wrapper = await mountSuspended(CatchAll, { route: "/privacy" })
    expect(wrapper.text()).toContain("Privacy body")
  })

  test("rejects an unknown path", async () => {
    await expect(
      mountSuspended(CatchAll, { route: "/missing" }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

test("the homepage consumes the email confirmation link and removes the token", async () => {
  mockApi("GET /login/confirm-email", { msg: "Confirmed" })
  await mountSuspended(Index, { route: "/?token=email-confirmation-token" })
  await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith("/login"))
  expect(useToast().toasts.value.map((toast) => toast.description)).toContain(
    "Confirmed",
  )
})
