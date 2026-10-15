import { pathWithoutLocale } from "@/utilities"

export default defineNuxtRouteMiddleware((_to, from) => {
  const routes = ["/login", "/signup", "/recover-password", "/reset-password"]
  const authStore = useAuthStore()
  if (authStore.loggedIn) {
    const locale = useNuxtApp().$i18n.locale.value
    if (routes.includes(pathWithoutLocale(from.path, locale)))
      return navigateTo("/")
    else return abortNavigation()
  }
})
