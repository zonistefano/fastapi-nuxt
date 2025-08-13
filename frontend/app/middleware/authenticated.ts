export default defineNuxtRouteMiddleware((_to, from) => {
  const authStore = useAuthStore()
  const routes = ["/login", "/join", "/recover-password", "/reset-password"]
  if (!authStore.loggedIn) {
    if (routes.includes(from.path)) return navigateTo("/")
    else return abortNavigation()
  }
})
