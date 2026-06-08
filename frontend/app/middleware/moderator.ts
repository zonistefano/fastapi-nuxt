import { translate as t } from "@/utilities"

export default defineNuxtRouteMiddleware((_to, _from) => {
  const authStore = useAuthStore()
  if (!authStore.isAdmin) {
    const toast = useToast()
    toast.add({
      title: t("notifications.permissionDenied"),
      description: t("notifications.permissionDeniedDescription"),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    })
    return abortNavigation()
  }
})
