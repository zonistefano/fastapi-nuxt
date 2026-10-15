import { beforeEach, describe, expect, test } from "bun:test"
import type { RouteLocationNormalized } from "vue-router"
import anonymous from "~/middleware/anonymous"
import authenticated from "~/middleware/authenticated"
import moderator from "~/middleware/moderator"
import { navigations, resetNuxt, sessionTokens, toasts } from "./nuxt"

type Middleware = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) => unknown

const route = (path: string) => ({ path }) as RouteLocationNormalized
const run = (middleware: unknown, from = "/") =>
  (middleware as Middleware)(route("/target"), route(from))

function signIn(is_superuser = false) {
  useTokenStore().setTokens(sessionTokens())
  useAuthStore().setUserProfile({
    id: "user-1",
    email: "a@example.com",
    is_active: true,
    is_superuser,
    created: "",
    modified: "",
    language: "en",
  })
}

beforeEach(() => resetNuxt())

describe("anonymous", () => {
  test("lets visitors through", () => {
    expect(run(anonymous)).toBeUndefined()
  })

  test("sends logged-in users home from an authentication page", () => {
    signIn()
    run(anonymous, "/signup")
    expect(navigations).toEqual(["/"])
  })

  test("recognizes authentication pages in another locale", () => {
    resetNuxt({ locale: "it" })
    signIn()
    run(anonymous, "/it/login")
    expect(navigations).toEqual(["/"])
  })

  test("aborts other navigations of logged-in users", () => {
    signIn()
    expect(run(anonymous, "/settings")).toBe(false)
    expect(navigations).toHaveLength(0)
  })
})

describe("authenticated", () => {
  test("lets logged-in users through", () => {
    signIn()
    expect(run(authenticated)).toBeUndefined()
    expect(toasts).toHaveLength(0)
  })

  test("aborts and notifies visitors", () => {
    expect(run(authenticated, "/blog")).toBe(false)
    expect(toasts[0]!.title).toBe("notifications.permissionDenied")
  })

  test("sends visitors home from an authentication page", () => {
    run(authenticated, "/recover-password")
    expect(navigations).toEqual(["/"])
  })
})

describe("moderator", () => {
  test("lets administrators through", () => {
    signIn(true)
    expect(run(moderator)).toBeUndefined()
  })

  test.each([false, true])(
    "aborts and notifies non-administrators (logged in: %p)",
    (loggedIn) => {
      if (loggedIn) signIn()
      expect(run(moderator)).toBe(false)
      expect(toasts[0]!.color).toBe("error")
    },
  )
})
