import { createPinia, defineStore, setActivePinia } from "pinia"
import { createClient } from "~/api/generated/client"

export { jwt, sessionTokens } from "./tokens"

export const API_URL = "https://api.example.com"

type Handler = (request: Request) => Response | Promise<Response>

const handlers = new Map<string, Handler>()
const nuxtApp = {
  $api: createClient(),
  $publicApi: createClient(),
  $i18n: { t: (key: string) => key, locale: { value: "en" } },
  runWithContext: <T>(fn: () => T) => fn(),
}

/** Toasts, navigations and requests recorded since the last `resetNuxt()`. */
export const toasts: Record<string, unknown>[] = []
export const navigations: unknown[] = []
export const requests: Request[] = []

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const request = new Request(input, init)
  requests.push(request)
  const handler = handlers.get(
    `${request.method} ${new URL(request.url).pathname}`,
  )
  return handler
    ? await handler(request.clone())
    : Response.json({ detail: "Not Found" }, { status: 404 })
}

/** Answers `"METHOD /path"` with a JSON body or a custom handler. */
export function mockApi(route: string, response: Handler | object) {
  handlers.set(
    route,
    typeof response === "function"
      ? (response as Handler)
      : () => Response.json(response),
  )
}

/** Fresh Pinia, empty API mocks and records: call it in `beforeEach`. */
export function resetNuxt({ locale = "en" } = {}) {
  setActivePinia(createPinia())
  handlers.clear()
  toasts.length = 0
  navigations.length = 0
  requests.length = 0
  nuxtApp.$i18n.locale.value = locale
  nuxtApp.$api = createClient({
    baseUrl: API_URL,
    fetch: fakeFetch,
    throwOnError: true,
  })
  nuxtApp.$publicApi = createClient({
    baseUrl: API_URL,
    fetch: fakeFetch,
    throwOnError: true,
  })
}

export function installNuxtGlobals() {
  Object.assign(globalThis, {
    defineStore,
    piniaPluginPersistedstate: { cookies: () => ({}) },
    useNuxtApp: () => nuxtApp,
    useToast: () => ({
      add: (toast: Record<string, unknown>) => toasts.push(toast),
    }),
    useRuntimeConfig: () => ({ public: { apiUrl: API_URL } }),
    useLocalePath: () => (path: string) =>
      nuxtApp.$i18n.locale.value === "en"
        ? path
        : `/${nuxtApp.$i18n.locale.value}${path}`,
    navigateTo: (to: unknown) => {
      navigations.push(to)
      return to
    },
    abortNavigation: () => false,
    defineNuxtRouteMiddleware: <T>(middleware: T) => middleware,
    defineNuxtPlugin: <T>(setup: T) => setup,
  })
}
