import { pathWithoutLocale, translate as t } from "@/utilities"

export default defineNuxtRouteMiddleware((_to, from) => {
  const authStore = useAuthStore()
  const routes = ["/login", "/signup", "/recover-password", "/reset-password"]
  if (!authStore.loggedIn) {
    const toast = useToast()
    toast.add({
      title: t("notifications.permissionDenied"),
      description: t("notifications.permissionDeniedDescription"),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    })
    const locale = useNuxtApp().$i18n.locale.value
    if (routes.includes(pathWithoutLocale(from.path, locale)))
      return navigateTo("/")
    else return abortNavigation()
  }
})
