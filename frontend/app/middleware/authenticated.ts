export default defineNuxtRouteMiddleware((_to, from) => {
  const authStore = useAuthStore()
  const routes = ["/login", "/join", "/recover-password", "/reset-password"]
  if (!authStore.loggedIn) {
    const toast = useToast()
    toast.add({
      title: "Permission denied",
      description: "You don't have permission to access this resource.",
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    })
    if (routes.includes(from.path)) return navigateTo("/")
    else return abortNavigation()
  }
})
