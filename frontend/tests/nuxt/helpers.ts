import { flushPromises } from "@vue/test-utils"
import type { DOMWrapper, VueWrapper } from "@vue/test-utils"
import { vi } from "vitest"
import type { CustomUserRead } from "~/api/generated"
import { sessionTokens } from "../tokens"

export { jwt, sessionTokens } from "../tokens"

type Handler = (request: Request) => Response | Promise<Response>

const handlers = new Map<string, Handler>()

/** Requests sent to the API since the last `resetApp()`. */
export const requests: Request[] = []

export const user: CustomUserRead = {
  id: "user-1",
  email: "a@example.com",
  email_validated: true,
  is_active: true,
  is_superuser: false,
  full_name: "Ada",
  hashed_password: true,
  totp: false,
  created: "2026-01-01T00:00:00Z",
  modified: "2026-01-02T00:00:00Z",
  language: "en",
  role: "user",
}

/** Answers `"METHOD /path"` on the API with a JSON body or a custom handler. */
export function mockApi(route: string, response: Handler | object) {
  handlers.set(
    route,
    typeof response === "function"
      ? (response as Handler)
      : () => Response.json(response),
  )
}

export const apiError =
  (status = 400) =>
  () =>
    Response.json({ detail: "Error" }, { status })

/** Logs out, clears toasts and routes every API call to `mockApi` handlers. */
export function resetApp() {
  handlers.clear()
  requests.length = 0
  const apiUrl = useRuntimeConfig().public.apiUrl
  const original = globalThis.fetch
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init)
    if (!request.url.startsWith(apiUrl)) return original(input, init)
    requests.push(request)
    const handler = handlers.get(
      `${request.method} ${new URL(request.url).pathname}`,
    )
    return handler
      ? await handler(request.clone())
      : Response.json({ detail: "Not Found" }, { status: 404 })
  })
  useAuthStore().clearSession()
  useToast().clear()
}

export function signIn(profile: Partial<CustomUserRead> = {}) {
  useTokenStore().setTokens(sessionTokens())
  useAuthStore().setUserProfile({ ...user, ...profile })
}

export const toastTitles = () =>
  useToast().toasts.value.map((toast) => toast.title)

export const apiPaths = () =>
  requests.map(
    (request) => `${request.method} ${new URL(request.url).pathname}`,
  )

/** Sets the inputs by `name` (or the input inside a field), then submits. */
export async function submitForm(
  wrapper: VueWrapper | DOMWrapper<Element>,
  values: Record<string, string> = {},
) {
  for (const [name, value] of Object.entries(values)) {
    const input = wrapper.find(`[name="${name}"], #${name}`)
    await input.setValue(value)
  }
  await wrapper.find("form").trigger("submit")
  // Nuxt UI validates asynchronously before emitting `submit`
  for (let i = 0; i < 5; i++) await flushPromises()
}
