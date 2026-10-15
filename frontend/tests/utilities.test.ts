import { beforeEach, describe, expect, test } from "bun:test"
import {
  generateUUID,
  getCommonItemsByKey,
  getContentLocalizedNavigation,
  getContentPath,
  getKeyByValue,
  getTimeInSeconds,
  isValidHttpUrl,
  pathWithoutLocale,
  readableDate,
  tokenExpired,
  tokenIsTOTP,
  tokenParser,
  translate,
} from "@/utilities"
import { jwt, resetNuxt } from "./nuxt"

beforeEach(() => resetNuxt())

describe("authentication token helpers", () => {
  test("decodes a JWT payload", () => {
    expect(tokenParser(jwt({ sub: "user-1", exp: 123 }))).toEqual({
      sub: "user-1",
      exp: 123,
    })
  })

  test("decodes UTF-8 claims", () => {
    expect(tokenParser(jwt({ name: "Zoë 🚀" })).name).toBe("Zoë 🚀")
  })

  test("distinguishes expired and valid sessions", () => {
    const now = getTimeInSeconds()
    expect(tokenExpired(jwt({ exp: now - 60 }))).toBe(true)
    expect(tokenExpired(jwt({ exp: now }))).toBe(true)
    expect(tokenExpired(jwt({ exp: now + 60 }))).toBe(false)
  })

  test("does not treat missing or invalid expiration as a valid session", () => {
    expect(tokenExpired(jwt({ sub: "user-1" }))).toBe(true)
    expect(tokenExpired(jwt({ exp: "invalid" }))).toBe(true)
  })

  test("rejects a token without a payload", () => {
    expect(() => tokenParser("invalid-token")).toThrow("Missing JWT payload")
    expect(() => tokenParser("")).toThrow("Missing JWT payload")
  })

  test("recognizes the second-factor challenge", () => {
    expect(tokenIsTOTP(jwt({ totp: true }))).toBe(true)
    expect(tokenIsTOTP(jwt({ totp: false }))).toBe(false)
    expect(tokenIsTOTP(jwt({ sub: "user-1" }))).toBe(false)
  })
})

describe("generic helpers", () => {
  test("generates distinct v4 UUIDs", () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(generateUUID()).not.toBe(uuid)
  })

  test("accepts only http and https URLs", () => {
    expect(isValidHttpUrl("https://example.com/path?q=1")).toBe(true)
    expect(isValidHttpUrl("http://localhost:3000")).toBe(true)
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isValidHttpUrl("ftp://example.com")).toBe(false)
    expect(isValidHttpUrl("example.com")).toBe(false)
  })

  test("finds the first key holding a value", () => {
    expect(getKeyByValue({ a: 1, b: 2, c: 2 }, 2)).toBe("b")
    expect(getKeyByValue({ a: 1 }, 3)).toBeUndefined()
  })

  test("returns the current time in whole seconds", () => {
    const before = Math.floor(Date.now() / 1000)
    const seconds = getTimeInSeconds()
    expect(Number.isInteger(seconds)).toBe(true)
    expect(seconds).toBeGreaterThanOrEqual(before)
  })

  test("keeps the items of the first list whose key is in the second", () => {
    const first = [
      { code: "en", name: "English" },
      { code: "it", name: "Italiano" },
      { code: "fr", name: "Français" },
    ]
    expect(
      getCommonItemsByKey(first, [{ code: "it" }, { code: "en" }], "code"),
    ).toEqual([first[0]!, first[1]!])
    expect(getCommonItemsByKey(first, [], "code")).toEqual([])
  })

  test("strips only a leading locale segment", () => {
    expect(pathWithoutLocale("/it/blog/post", "it")).toBe("/blog/post")
    expect(pathWithoutLocale("/it", "it")).toBe("")
    expect(pathWithoutLocale("/italy/it", "it")).toBe("/italy/it")
    expect(pathWithoutLocale("/blog", "en")).toBe("/blog")
  })
})

describe("i18n and text helpers", () => {
  test("translates through the Nuxt i18n instance", () => {
    expect(translate("common.save")).toBe("common.save")
  })

  test("formats dates with and without the year", () => {
    const date = "2026-03-15T12:00:00Z"
    expect(readableDate(date, true, "en")).toBe("15 Mar 2026")
    expect(readableDate(new Date(date), false, "it")).toBe("15 mar")
  })

  test("defaults to the active locale", () => {
    resetNuxt({ locale: "it" })
    expect(readableDate("2026-03-15T12:00:00Z")).toBe("15 mar 2026")
  })
})

describe("content helpers", () => {
  test("maps a route to the localized content path", () => {
    expect(getContentPath("/blog/post", "en")).toBe("/en/blog/post")
    expect(getContentPath("/it/blog/post", "it")).toBe("/it/blog/post")
    expect(getContentPath("/it", "it")).toBe("/it/")
  })

  test("localizes navigation links recursively", () => {
    resetNuxt({ locale: "it" })
    const navigation = getContentLocalizedNavigation([
      {
        title: "Docs",
        path: "/docs",
        children: [{ title: "Usage", path: "/docs/usage" }],
      },
      { title: "Empty", path: "" },
    ])
    expect(navigation).toEqual([
      {
        title: "Docs",
        path: "/it/docs",
        children: [
          { title: "Usage", path: "/it/docs/usage", children: undefined },
        ],
      },
      { title: "Empty", path: "", children: undefined },
    ])
  })

  test("skips missing surround items", () => {
    const surround = [undefined, { title: "Next", path: "/next" }]
    expect(
      getContentLocalizedNavigation(
        surround as Parameters<typeof getContentLocalizedNavigation>[0],
      ),
    ).toEqual([
      undefined,
      { title: "Next", path: "/next", children: undefined },
    ])
  })
})
