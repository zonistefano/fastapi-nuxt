export default defineNuxtRouteMiddleware((_to, _from) => {
  const authStore = useAuthStore()
  if (!authStore.isAdmin) {
    const toast = useToast()
    toast.add({
      title: "Permission denied",
      description: "You don't have permission to access this resource.",
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    })
    return abortNavigation()
  }
})
