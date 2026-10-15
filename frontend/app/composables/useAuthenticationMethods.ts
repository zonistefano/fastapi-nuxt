import { loginLoginMethods } from "~/api/generated"

export function useAuthenticationMethods() {
  const { $publicApi } = useNuxtApp()
  return useAsyncData("auth-methods", () =>
    loginLoginMethods({ client: $publicApi }),
  )
}
