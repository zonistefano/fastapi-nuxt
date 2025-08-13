export default defineNuxtRouteMiddleware((_to, from) => {
  const routes = ["/login", "/join", "/recover-password", "/reset-password"]
  const authStore = useAuthStore()
  if (authStore.loggedIn) {
    if (routes.includes(from.path)) return navigateTo("/")
    else return abortNavigation()
  }
})
