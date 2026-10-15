import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import type { Client } from "~/api/generated/client"
import { usersReadUserMe } from "~/api/generated"
import apiPlugin from "~/plugins/api"
import {
  API_URL,
  jwt,
  mockApi,
  navigations,
  resetNuxt,
  sessionTokens,
  toasts,
} from "../fakes"

type Provided = { provide: { api: Client; publicApi: Client } }

const setup = () =>
  (apiPlugin as unknown as (app: unknown) => Provided)(useNuxtApp()).provide

let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">>
const sent: Request[] = []

function respond(...statuses: number[]) {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
    input: RequestInfo | URL,
  ) => {
    sent.push(new Request(input))
    const status = statuses.shift() ?? 200
    return Response.json(status === 200 ? {} : { detail: "Error" }, { status })
  }) as typeof fetch)
}

beforeEach(() => {
  resetNuxt()
  sent.length = 0
})
afterEach(() => fetchSpy?.mockRestore())

describe("api plugin", () => {
  test("provides an authenticated and a public client for the API URL", async () => {
    respond(200, 200)
    useTokenStore().setTokens(sessionTokens())
    const { api, publicApi } = setup()
    await usersReadUserMe({ client: api })
    await usersReadUserMe({ client: publicApi })
    expect(sent.map((r) => r.url)).toEqual([
      `${API_URL}/users/me`,
      `${API_URL}/users/me`,
    ])
    expect(sent[0]!.headers.get("Authorization")).toBe(
      `Bearer ${useTokenStore().token}`,
    )
    expect(sent[1]!.headers.get("Authorization")).toBeNull()
  })

  test("refreshes the session and retries after a 401", async () => {
    respond(401, 200)
    const renewed = sessionTokens("user-1")
    renewed.access_token = jwt({ sub: "user-1", exp: 9999999999 })
    mockApi("POST /login/refresh", renewed)
    useTokenStore().setTokens(sessionTokens())
    await usersReadUserMe({ client: setup().api })
    expect(sent).toHaveLength(2)
    expect(sent[1]!.headers.get("Authorization")).toBe(
      `Bearer ${renewed.access_token}`,
    )
    expect(navigations).toHaveLength(0)
  })

  test("logs out and redirects to login when the session cannot be renewed", async () => {
    respond(401)
    useTokenStore().setTokens({
      access_token: jwt({ sub: "user-1", exp: 1 }),
      refresh_token: null,
      token_type: "bearer",
    })
    await expect(usersReadUserMe({ client: setup().api })).rejects.toEqual({
      detail: "Error",
    })
    expect(useTokenStore().access_token).toBe("")
    expect(navigations).toEqual(["/login"])
  })

  test("notifies on 403", async () => {
    respond(403)
    await expect(usersReadUserMe({ client: setup().api })).rejects.toBeDefined()
    expect(toasts[0]!.title).toBe("notifications.permissionDenied")
  })
})
