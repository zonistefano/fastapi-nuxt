import { beforeEach, expect, test } from "bun:test"
import { useAuthenticationMethods } from "~/composables/useAuthenticationMethods"
import { mockApi, requests, resetNuxt } from "./fakes"

beforeEach(() => resetNuxt())

test("loads only public authentication capabilities through the generated client", async () => {
  const methods = {
    social_providers: ["google"],
    passkeys: true,
    registration: false,
  }
  mockApi("GET /login/methods", methods)
  const result = await useAuthenticationMethods()
  expect(result.data.value).toEqual(methods)
  expect(requests[0]!.headers.get("Authorization")).toBeNull()
})
