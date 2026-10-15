import { translate as t } from "@/utilities"

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  if (!auth.loggedIn) return navigateTo(useLocalePath()("/login"))
  if (!auth.isAdmin) {
    useToast().add({
      title: t("notifications.permissionDenied"),
      description: t("notifications.permissionDeniedDescription"),
      color: "error",
    })
    return navigateTo(useLocalePath()("/"))
  }
})
