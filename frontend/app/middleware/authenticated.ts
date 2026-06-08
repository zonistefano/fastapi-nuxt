import { translate as t } from "@/utilities"

export default defineNuxtRouteMiddleware((_to, from) => {
  const authStore = useAuthStore()
  const routes = ["/login", "/join", "/recover-password", "/reset-password"]
  if (!authStore.loggedIn) {
    const toast = useToast()
    toast.add({
      title: t("notifications.permissionDenied"),
      description: t("notifications.permissionDeniedDescription"),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    })
    if (routes.includes(from.path)) return navigateTo("/")
    else return abortNavigation()
  }
})
