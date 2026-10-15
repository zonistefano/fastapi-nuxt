import { beforeEach, describe, expect, test } from "bun:test"
import {
  jwt,
  mockApi,
  requests,
  resetNuxt,
  sessionTokens,
  toasts,
} from "../fakes"

const now = () => Math.floor(Date.now() / 1000)
const magicClaim = (fingerprint = "fp-1") =>
  jwt({ sub: "claim", exp: now() + 600, fingerprint })

beforeEach(() => resetNuxt())

describe("token getters", () => {
  test("an empty store has no session", () => {
    const tokens = useTokenStore()
    expect(tokens.hasActiveAccessToken).toBe(false)
    expect(tokens.hasUsableRefreshToken).toBe(false)
    expect(tokens.hasValidToken).toBe(false)
  })

  test("a fresh access token is a valid session", () => {
    const tokens = useTokenStore()
    tokens.setTokens(sessionTokens())
    expect(tokens.token).toBe(tokens.access_token)
    expect(tokens.refresh).toBe(tokens.refresh_token)
    expect(tokens.hasValidToken).toBe(true)
  })

  test("an expired access token is still renewable with a refresh token", () => {
    const tokens = useTokenStore()
    tokens.setTokens({
      ...sessionTokens(),
      access_token: jwt({ sub: "user-1", exp: now() - 10 }),
    })
    expect(tokens.hasActiveAccessToken).toBe(false)
    expect(tokens.hasValidToken).toBe(true)
  })

  test("TOTP challenges and magic-link claims are not sessions", () => {
    const tokens = useTokenStore()
    tokens.setTokens({
      access_token: jwt({ sub: "user-1", exp: now() + 60, totp: true }),
      refresh_token: null,
      token_type: "bearer",
    })
    expect(tokens.hasValidToken).toBe(false)
    tokens.setMagicToken({ claim: magicClaim() })
    expect(tokens.hasValidToken).toBe(false)
  })

  test("a refresh token without an access token is not a session", () => {
    const tokens = useTokenStore()
    tokens.setTokens({ ...sessionTokens(), access_token: "" })
    expect(tokens.hasValidToken).toBe(false)
  })
})

describe("getTokens", () => {
  test("logs in with a password through OAuth2", async () => {
    const issued = sessionTokens()
    mockApi("POST /login/oauth", issued)
    const tokens = useTokenStore()
    await tokens.getTokens({ username: "a@example.com", password: "secret" })
    expect(tokens.access_token).toBe(issued.access_token)
    expect(tokens.refresh_token).toBe(issued.refresh_token)
    const body = new URLSearchParams(await requests[0]!.text())
    expect(body.get("username")).toBe("a@example.com")
  })

  test("requests a magic link without a password and keeps the claim", async () => {
    const claim = magicClaim()
    mockApi("POST /login/magic/a%40example.com", { claim })
    const tokens = useTokenStore()
    await tokens.getTokens({ username: "a@example.com" })
    expect(tokens.access_token).toBe(claim)
    expect(tokens.refresh_token).toBe("")
  })

  test("clears the tokens and notifies on failure", async () => {
    const tokens = useTokenStore()
    tokens.setTokens(sessionTokens())
    await tokens.getTokens({ username: "a@example.com", password: "wrong" })
    expect(tokens.access_token).toBe("")
    expect(toasts).toHaveLength(1)
    expect(toasts[0]!.title).toBe("notifications.loginError")
  })
})

describe("validateMagicTokens", () => {
  test("exchanges matching fingerprints for a session", async () => {
    const issued = sessionTokens()
    const claim = magicClaim("fp-1")
    const emailed = jwt({ sub: "user-1", fingerprint: "fp-1" })
    mockApi("POST /login/claim", issued)
    const tokens = useTokenStore()
    tokens.setMagicToken({ claim })
    await tokens.validateMagicTokens(emailed)
    expect(tokens.access_token).toBe(issued.access_token)
    expect(requests[0]!.headers.get("Authorization")).toBe(`Bearer ${emailed}`)
    expect(await requests[0]!.json()).toEqual({ claim })
  })

  test("rejects a link opened in another browser without calling the API", async () => {
    const tokens = useTokenStore()
    tokens.setMagicToken({ claim: magicClaim("fp-1") })
    await tokens.validateMagicTokens(jwt({ fingerprint: "fp-2" }))
    expect(requests).toHaveLength(0)
    expect(tokens.access_token).toBe("")
    expect(toasts[0]!.description).toBe("notifications.sameBrowserDescription")
  })

  test("rejects a link when no claim is stored", async () => {
    const tokens = useTokenStore()
    await tokens.validateMagicTokens(jwt({ fingerprint: "fp-1" }))
    expect(requests).toHaveLength(0)
    expect(toasts).toHaveLength(1)
  })
})

describe("validateTOTPClaim", () => {
  test("sends the code with the TOTP challenge token", async () => {
    const challenge = jwt({ sub: "user-1", exp: now() + 60, totp: true })
    const issued = sessionTokens()
    mockApi("POST /login/totp", issued)
    const tokens = useTokenStore()
    tokens.setTokens({
      access_token: challenge,
      refresh_token: null,
      token_type: "bearer",
    })
    await tokens.validateTOTPClaim("123456")
    expect(requests[0]!.headers.get("Authorization")).toBe(
      `Bearer ${challenge}`,
    )
    expect(await requests[0]!.json()).toEqual({ claim: "123456" })
    expect(tokens.hasValidToken).toBe(true)
  })

  test("preserves the challenge so a wrong code can be retried", async () => {
    mockApi("POST /login/totp", () =>
      Response.json({ detail: "Invalid" }, { status: 400 }),
    )
    const tokens = useTokenStore()
    tokens.setMagicToken({ claim: jwt({ totp: true }) })
    await tokens.validateTOTPClaim("000000")
    expect(tokens.access_token).not.toBe("")
    expect(toasts[0]!.title).toBe("notifications.twoFactorError")
  })
})

describe("refreshTokens", () => {
  test("keeps an active access token unless forced", async () => {
    const tokens = useTokenStore()
    tokens.setTokens(sessionTokens())
    expect(await tokens.refreshTokens()).toBe(true)
    expect(requests).toHaveLength(0)
  })

  test("drops the session when no usable refresh token exists", async () => {
    const tokens = useTokenStore()
    tokens.setTokens({ ...sessionTokens(), refresh_token: null })
    expect(await tokens.refreshTokens(true)).toBe(false)
    expect(tokens.access_token).toBe("")
    expect(requests).toHaveLength(0)
  })

  test("renews the tokens with the refresh token", async () => {
    const old = sessionTokens()
    const renewed = sessionTokens("user-1")
    renewed.access_token = jwt({ sub: "user-1", exp: now() + 7200 })
    mockApi("POST /login/refresh", renewed)
    const tokens = useTokenStore()
    tokens.setTokens(old)
    expect(await tokens.refreshTokens(true)).toBe(true)
    expect(requests[0]!.headers.get("Authorization")).toBe(
      `Bearer ${old.refresh_token}`,
    )
    expect(tokens.access_token).toBe(renewed.access_token)
  })

  test("shares a single request between concurrent refreshes", async () => {
    mockApi("POST /login/refresh", sessionTokens())
    const tokens = useTokenStore()
    tokens.setTokens(sessionTokens())
    const results = await Promise.all([
      tokens.refreshTokens(true),
      tokens.refreshTokens(true),
      tokens.refreshTokens(true),
    ])
    expect(results).toEqual([true, true, true])
    expect(requests).toHaveLength(1)
    await tokens.refreshTokens(true)
    expect(requests).toHaveLength(2)
  })

  test("drops the session when the server rejects the refresh token", async () => {
    mockApi("POST /login/refresh", () =>
      Response.json({ detail: "Revoked" }, { status: 401 }),
    )
    const tokens = useTokenStore()
    tokens.setTokens(sessionTokens())
    expect(await tokens.refreshTokens(true)).toBe(false)
    expect(tokens.access_token).toBe("")
  })
})

test("a completed refresh cannot restore a session cleared during logout", async () => {
  let finish!: (response: Response) => void
  mockApi(
    "POST /login/refresh",
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve
      }),
  )
  mockApi("POST /login/revoke", { msg: "Revoked" })
  const tokens = useTokenStore()
  tokens.setTokens(sessionTokens())
  const refreshing = tokens.refreshTokens(true)
  await new Promise((resolve) => setTimeout(resolve, 0))
  tokens.deleteTokens()
  finish(Response.json(sessionTokens("new-session")))
  expect(await refreshing).toBe(false)
  expect(tokens.token).toBe("")
  expect(requests.at(-1)!.url).toEndWith("/login/revoke")
})

test("a failed refresh cannot clear a newer session", async () => {
  let finish!: (response: Response) => void
  mockApi(
    "POST /login/refresh",
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve
      }),
  )
  const tokens = useTokenStore()
  tokens.setTokens(sessionTokens())
  const refreshing = tokens.refreshTokens(true)
  await new Promise((resolve) => setTimeout(resolve, 0))
  const newer = sessionTokens("other-user")
  tokens.setTokens(newer)
  finish(Response.json({ detail: "Revoked" }, { status: 401 }))
  expect(await refreshing).toBe(false)
  expect(tokens.token).toBe(newer.access_token)
})

test("refresh and email-purpose tokens cannot become access sessions", () => {
  for (const payload of [
    { refresh: true },
    { purpose: "refresh" },
    { purpose: "password_reset" },
  ]) {
    const tokens = useTokenStore()
    tokens.setTokens({
      ...sessionTokens(),
      access_token: jwt({ exp: 9999999999, ...payload }),
    })
    expect(tokens.hasValidToken).toBe(false)
  }
})
