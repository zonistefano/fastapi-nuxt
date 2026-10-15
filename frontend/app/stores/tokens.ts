import {
  loginLoginWithMagicLink,
  loginLoginWithOauth2,
  loginLoginWithTotp,
  loginRefreshToken,
  loginValidateMagicLink,
} from "~/api/generated"
import type { Token, WebToken } from "~/api/generated"
import {
  tokenExpired,
  tokenParser,
  tokenIsTOTP,
  translate as t,
} from "@/utilities"

const refreshPromises = new WeakMap<object, Promise<boolean>>()

export const useTokenStore = defineStore("tokens", {
  state: (): Token => ({
    access_token: "",
    refresh_token: "",
    token_type: "",
  }),
  persist: true,
  getters: {
    token: (state) => state.access_token,
    refresh: (state) => state.refresh_token,
    hasActiveAccessToken: (state) => {
      return Boolean(state.access_token) && !tokenExpired(state.access_token)
    },
    hasUsableRefreshToken: (state) => {
      return !!state.refresh_token && !tokenExpired(state.refresh_token)
    },
    hasValidToken(): boolean {
      if (!this.token) return false
      if (!this.hasActiveAccessToken && !this.hasUsableRefreshToken)
        return false
      // TOTP challenges and magic-link claims are not session tokens
      return (
        !tokenIsTOTP(this.token) && !("fingerprint" in tokenParser(this.token))
      )
    },
  },
  actions: {
    async getTokens(payload: { username: string; password?: string }) {
      const toast = useToast()
      const client = useNuxtApp().$publicApi
      try {
        const response =
          payload.password !== undefined
            ? await loginLoginWithOauth2({
                client,
                body: {
                  username: payload.username,
                  password: payload.password,
                },
              })
            : await loginLoginWithMagicLink({
                client,
                path: { email: payload.username },
              })
        if ("claim" in response) this.setMagicToken(response)
        else this.setTokens(response)
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.loginErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.deleteTokens()
      }
    },
    async validateMagicTokens(token: string) {
      const toast = useToast()
      try {
        const data: string = this.token
        // Check the two magic tokens meet basic criteria
        const localClaim = tokenParser(data)
        const magicClaim = tokenParser(token)
        if (
          localClaim &&
          magicClaim &&
          Object.prototype.hasOwnProperty.call(localClaim, "fingerprint") &&
          Object.prototype.hasOwnProperty.call(magicClaim, "fingerprint") &&
          localClaim["fingerprint"] === magicClaim["fingerprint"]
        ) {
          const response = await loginValidateMagicLink({
            client: useNuxtApp().$publicApi,
            body: { claim: data },
            headers: { Authorization: `Bearer ${token}` },
          })
          if (response) {
            this.setTokens(response)
          } else throw "Error"
        } else throw "Error"
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.sameBrowserDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.deleteTokens()
      }
    },
    async validateTOTPClaim(data: string) {
      const toast = useToast()
      try {
        const response = await loginLoginWithTotp({
          client: useNuxtApp().$publicApi,
          body: { claim: data },
          headers: { Authorization: `Bearer ${this.access_token}` },
        })
        if (response) {
          this.setTokens(response)
        } else throw "Error"
      } catch {
        toast.add({
          title: t("notifications.twoFactorError"),
          description: t("notifications.twoFactorErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.deleteTokens()
      }
    },
    setMagicToken(payload: WebToken) {
      this.access_token = payload.claim
    },
    setTokens(payload: Token) {
      this.access_token = payload.access_token
      this.refresh_token = payload.refresh_token
      this.token_type = payload.token_type
    },
    async refreshTokens(force = false) {
      if (!force && this.hasActiveAccessToken) return true
      if (!this.hasUsableRefreshToken) {
        this.deleteTokens()
        return false
      }
      const pending = refreshPromises.get(this)
      if (pending) return await pending

      const refreshPromise = loginRefreshToken({
        client: useNuxtApp().$publicApi,
        headers: { Authorization: `Bearer ${this.refresh}` },
      })
        .then((response) => {
          this.setTokens(response)
          return true
        })
        .catch(() => {
          this.deleteTokens()
          return false
        })
        .finally(() => {
          refreshPromises.delete(this)
        })

      refreshPromises.set(this, refreshPromise)
      return await refreshPromise
    },
    // reset state using `$reset`
    deleteTokens() {
      this.$reset()
    },
  },
})
