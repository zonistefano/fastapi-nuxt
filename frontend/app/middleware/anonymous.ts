export default defineNuxtRouteMiddleware(() => {
  if (useAuthStore().loggedIn) return navigateTo(useLocalePath()("/"))
})
