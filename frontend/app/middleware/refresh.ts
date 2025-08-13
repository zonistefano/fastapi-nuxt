export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const authStore = useAuthStore()
  if (!authStore.loggedIn) {
    await authStore.getUserProfile()
  }
})
