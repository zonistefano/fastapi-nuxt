import { describe, expect, test } from "bun:test"
import { tokenExpired, tokenParser } from "../app/utilities/generic"
import { tokenIsTOTP } from "../app/utilities/totp"

function token(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`
}

describe("authentication token helpers", () => {
  test("decodes a JWT payload", () => {
    expect(tokenParser(token({ sub: "user-1", exp: 123 }))).toEqual({
      sub: "user-1",
      exp: 123,
    })
  })

  test("distinguishes expired and valid sessions", () => {
    const now = Math.floor(Date.now() / 1000)
    expect(tokenExpired(token({ exp: now - 60 }))).toBe(true)
    expect(tokenExpired(token({ exp: now + 60 }))).toBe(false)
  })

  test("does not treat missing or invalid expiration as a valid session", () => {
    expect(tokenExpired(token({ sub: "user-1" }))).toBe(true)
    expect(tokenExpired(token({ exp: "invalid" }))).toBe(true)
  })

  test("rejects a token without a payload", () => {
    expect(() => tokenParser("invalid-token")).toThrow("Missing JWT payload")
  })

  test("recognizes the second-factor challenge", () => {
    expect(tokenIsTOTP(token({ totp: true }))).toBe(true)
    expect(tokenIsTOTP(token({ totp: false }))).toBe(false)
    expect(tokenIsTOTP(token({ sub: "user-1" }))).toBe(false)
  })
})
