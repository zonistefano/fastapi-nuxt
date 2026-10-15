import { createClient } from "~/api/generated/client"
import { createAuthenticatedFetch } from "~/api/transport"
import { translate as t } from "~/utilities/i18n"

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const baseUrl =
    nuxtApp.ssrContext && config.apiInternalUrl
      ? config.apiInternalUrl
      : config.public.apiUrl
  const tokens = useTokenStore()
  const authenticatedFetch = createAuthenticatedFetch({
    getToken: () => (tokens.hasValidToken ? tokens.token : ""),
    refresh: () => nuxtApp.runWithContext(() => tokens.refreshTokens(true)),
    onUnauthorized: () =>
      nuxtApp.runWithContext(async () => {
        useAuthStore().clearSession()
        await navigateTo(useLocalePath()("/login"))
      }),
    onForbidden: async (response) => {
      const error = await response.json().catch(() => null)
      return nuxtApp.runWithContext(() => {
        if (error?.detail === "Recent authentication required.") {
          useAuthStore().reauthenticationRequired = true
          return
        }
        useToast().add({
          title: t("notifications.permissionDenied"),
          description: t("notifications.permissionDeniedDescription"),
          icon: "i-heroicons-exclamation-circle",
          color: "error",
        })
      })
    },
  })

  return {
    provide: {
      api: createClient({
        baseUrl,
        fetch: authenticatedFetch,
        throwOnError: true,
      }),
      publicApi: createClient({
        baseUrl,
        throwOnError: true,
      }),
    },
  }
})
