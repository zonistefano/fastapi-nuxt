export default defineNuxtRouteMiddleware((_to, _from) => {
  const authStore = useAuthStore()
  if (!authStore.isAdmin) {
    return abortNavigation()
  }
})
