import { createClient } from "~/api/generated/client"
import { createAuthenticatedFetch } from "~/api/transport"
import { translate as t } from "~/utilities/i18n"

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const tokens = useTokenStore()
  const authenticatedFetch = createAuthenticatedFetch({
    getToken: () => tokens.token,
    refresh: () => nuxtApp.runWithContext(() => tokens.refreshTokens(true)),
    onUnauthorized: () =>
      nuxtApp.runWithContext(async () => {
        useAuthStore().logOut()
        await navigateTo("/login")
      }),
    onForbidden: () =>
      nuxtApp.runWithContext(() => {
        useToast().add({
          title: t("notifications.permissionDenied"),
          description: t("notifications.permissionDeniedDescription"),
          icon: "i-heroicons-exclamation-circle",
          color: "error",
        })
      }),
  })

  return {
    provide: {
      api: createClient({
        baseUrl: config.public.apiUrl,
        fetch: authenticatedFetch,
        throwOnError: true,
      }),
      publicApi: createClient({
        baseUrl: config.public.apiUrl,
        throwOnError: true,
      }),
    },
  }
})
