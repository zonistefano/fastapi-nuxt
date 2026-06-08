import type { FetchOptions } from "ofetch"

import { translate as t } from "@/utilities"

type ApiMethod =
  | "GET"
  | "HEAD"
  | "PATCH"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"

type ApiRequestOptions = FetchOptions & {
  key?: string
  method?: ApiMethod
}

function showForbiddenToast() {
  const toast = useToast()
  toast.add({
    title: t("notifications.permissionDenied"),
    description: t("notifications.permissionDeniedDescription"),
    icon: "i-heroicons-exclamation-circle",
    color: "error",
  })
}

async function handleUnauthorized() {
  const tokenStore = useTokenStore()
  const refreshed = await tokenStore.refreshTokens()

  if (refreshed) return true

  const authStore = useAuthStore()
  authStore.logOut()
  await navigateTo("/login")
  return false
}

function requestHeaders(token: string, headers?: HeadersInit): HeadersInit {
  const nextHeaders = new Headers(headers)
  nextHeaders.set("Cache-Control", "no-cache")
  nextHeaders.set("Authorization", `Bearer ${token}`)
  return nextHeaders
}

export const apiCore = {
  url(): string {
    return useRuntimeConfig().public.apiUrl
  },
  // WS(): string {
  //   return useRuntimeConfig().public.apiWS
  // },
  headers(token: string) {
    return {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${token}`,
    }
  },
  async request<T>(path: string, options: ApiRequestOptions = {}) {
    const tokenStore = useTokenStore()
    const { key: _key, ...fetchOptions } = options

    if (!tokenStore.hasValidToken) {
      const authStore = useAuthStore()
      authStore.logOut()
    }

    try {
      return await $fetch<T>(path, {
        baseURL: this.url(),
        ...fetchOptions,
        headers: requestHeaders(tokenStore.token, fetchOptions.headers),
      })
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        const statusCode = Number(error.statusCode)
        if (statusCode === 401 && (await handleUnauthorized())) {
          return await $fetch<T>(path, {
            baseURL: this.url(),
            ...fetchOptions,
            headers: requestHeaders(tokenStore.token, fetchOptions.headers),
          })
        }
        if (statusCode === 403) showForbiddenToast()
      }
      throw error
    }
  },
  async useRequest<T>(path: string, options: ApiRequestOptions = {}) {
    const { key, ...fetchOptions } = options
    const asyncKey = key || `${fetchOptions.method || "GET"}:${path}`

    return await useAsyncData<T>(asyncKey, () =>
      this.request<T>(path, fetchOptions),
    )
  },
  async stream(path: string, options: RequestInit = {}) {
    const tokenStore = useTokenStore()

    const send = () =>
      fetch(`${this.url()}${path}`, {
        ...options,
        headers: requestHeaders(tokenStore.token, options.headers),
      })

    let response = await send()
    if (response.status === 401 && (await handleUnauthorized())) {
      response = await send()
    }
    if (response.status === 403) showForbiddenToast()

    return response
  },
}
