import { describe, expect, test } from "bun:test"
import { createClient } from "../app/api/generated/client"
import {
  loginLoginWithOauth2,
  loginLoginWithMagicLink,
  loginRefreshToken,
  servicesSendEmail,
  usersUpdateUserById,
} from "../app/api/generated/sdk.gen"
import { createAuthenticatedFetch } from "../app/api/transport"

describe("generated API client", () => {
  test("serializes OAuth credentials as a form and infers the response", async () => {
    let sent: Request | undefined
    const client = createClient({
      baseUrl: "https://api.example.com",
      fetch: async (input) => {
        sent = new Request(input)
        return Response.json({ access_token: "access", token_type: "bearer" })
      },
      throwOnError: true,
    })
    const tokens = await loginLoginWithOauth2({
      client,
      body: { username: "a+b@example.com", password: "password & =" },
    })
    expect(tokens.access_token).toBe("access")
    expect(sent!.url).toBe("https://api.example.com/login/oauth")
    expect(sent!.headers.get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    )
    const body = new URLSearchParams(await sent!.text())
    expect(body.get("username")).toBe("a+b@example.com")
    expect(body.get("password")).toBe("password & =")
  })

  test("uses schema paths and JSON payloads", async () => {
    const requests: Request[] = []
    const client = createClient({
      baseUrl: "https://api.example.com",
      fetch: async (input) => {
        requests.push(new Request(input))
        return Response.json({ msg: "ok" })
      },
    })
    await servicesSendEmail({
      client,
      body: { email: "a@example.com", subject: "Test", content: "Hello" },
    })
    expect(requests[0]!.url).toBe("https://api.example.com/services/contact")
    expect(await requests[0]!.json()).toEqual({
      email: "a@example.com",
      subject: "Test",
      content: "Hello",
    })
    await usersUpdateUserById({
      client,
      path: { user_id: "user/with spaces" },
      body: { language: "it" },
    })
    expect(requests[1]!.url).toBe(
      "https://api.example.com/users/user%2Fwith%20spaces",
    )
  })

  test("public calls send no access token and throw API errors", async () => {
    const client = createClient({
      baseUrl: "https://api.example.com",
      fetch: async (input) => {
        expect(new Request(input).headers.get("Authorization")).toBeNull()
        return Response.json({ detail: "Rate limited" }, { status: 429 })
      },
      throwOnError: true,
    })
    await expect(
      loginLoginWithMagicLink({ client, path: { email: "a@example.com" } }),
    ).rejects.toEqual({ detail: "Rate limited" })
  })

  test("refresh uses the explicitly supplied refresh token", async () => {
    const client = createClient({
      baseUrl: "https://api.example.com",
      fetch: async (input) => {
        const request = new Request(input)
        expect(request.url).toBe("https://api.example.com/login/refresh")
        expect(request.headers.get("Authorization")).toBe(
          "Bearer refresh-token",
        )
        return Response.json({ access_token: "renewed", token_type: "bearer" })
      },
    })
    await loginRefreshToken({
      client,
      headers: { Authorization: "Bearer refresh-token" },
    })
  })
})

describe("authenticated transport", () => {
  test("retries a consumed JSON body once with the renewed token", async () => {
    let token = "expired"
    let attempts = 0
    const transport = createAuthenticatedFetch(
      {
        getToken: () => token,
        refresh: async () => {
          token = "renewed"
          return true
        },
        onUnauthorized: async () => {
          throw new Error("Unexpected logout")
        },
        onForbidden: () => {},
      },
      async (input) => {
        const request = new Request(input)
        attempts++
        expect(await request.json()).toEqual({ language: "it" })
        expect(request.headers.get("Authorization")).toBe(
          attempts === 1 ? "Bearer expired" : "Bearer renewed",
        )
        return Response.json({}, { status: attempts === 1 ? 401 : 200 })
      },
    )
    const response = await transport("https://api.example.com/users/me", {
      method: "PUT",
      body: JSON.stringify({ language: "it" }),
    })
    expect(response.status).toBe(200)
    expect(attempts).toBe(2)
  })

  test("logs out after a failed refresh without retrying indefinitely", async () => {
    let attempts = 0
    let logouts = 0
    const transport = createAuthenticatedFetch(
      {
        getToken: () => "invalid",
        refresh: async () => true,
        onUnauthorized: async () => {
          logouts++
        },
        onForbidden: () => {},
      },
      async () => {
        attempts++
        return new Response(null, { status: 401 })
      },
    )
    expect((await transport("https://api.example.com/users/me")).status).toBe(
      401,
    )
    expect(attempts).toBe(2)
    expect(logouts).toBe(1)
  })

  test("does not retry when refresh is unavailable", async () => {
    let attempts = 0
    let logouts = 0
    const transport = createAuthenticatedFetch(
      {
        getToken: () => "expired",
        refresh: async () => false,
        onUnauthorized: async () => {
          logouts++
        },
        onForbidden: () => {},
      },
      async () => {
        attempts++
        return new Response(null, { status: 401 })
      },
    )
    await transport("https://api.example.com/users/me")
    expect(attempts).toBe(1)
    expect(logouts).toBe(1)
  })

  test("keeps tokens isolated between client instances and handles forbidden", async () => {
    let forbidden = 0
    const makeTransport = (token: string) =>
      createAuthenticatedFetch(
        {
          getToken: () => token,
          refresh: async () => false,
          onUnauthorized: async () => {},
          onForbidden: () => {
            forbidden++
          },
        },
        async (input) => {
          expect(new Request(input).headers.get("Authorization")).toBe(
            `Bearer ${token}`,
          )
          return new Response(null, { status: 403 })
        },
      )
    await Promise.all([
      makeTransport("user-a")("https://api.example.com/users/"),
      makeTransport("user-b")("https://api.example.com/users/"),
    ])
    expect(forbidden).toBe(2)
  })
})
