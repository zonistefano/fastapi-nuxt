import { beforeEach, describe, expect, test } from "bun:test"
import type { RouteLocationNormalized } from "vue-router"
import anonymous from "~/middleware/anonymous"
import authenticated from "~/middleware/authenticated"
import moderator from "~/middleware/moderator"
import { navigations, resetNuxt, sessionTokens, toasts } from "./fakes"

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

describe("route guards", () => {
  test("anonymous allows visitors and redirects authenticated users", () => {
    expect(run(anonymous)).toBeUndefined()
    signIn()
    run(anonymous)
    expect(navigations).toEqual(["/"])
  })
  test("authenticated redirects direct visits to login", () => {
    run(authenticated)
    expect(navigations).toEqual(["/login"])
    signIn()
    expect(run(authenticated)).toBeUndefined()
  })
  test("guards preserve the locale", () => {
    resetNuxt({ locale: "it" })
    run(authenticated)
    expect(navigations).toEqual(["/it/login"])
    signIn()
    run(anonymous)
    expect(navigations.at(-1)).toBe("/it/")
  })
  test("moderator requires a session and an administrator", () => {
    run(moderator)
    expect(navigations).toEqual(["/login"])
    signIn()
    run(moderator)
    expect(navigations.at(-1)).toBe("/")
    expect(toasts[0]!.title).toBe("notifications.permissionDenied")
    signIn(true)
    expect(run(moderator)).toBeUndefined()
    useAuthStore().is_superuser = false
    useAuthStore().role = "admin"
    expect(run(moderator)).toBeUndefined()
  })
})
