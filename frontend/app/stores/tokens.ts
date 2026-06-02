import type { ITokenResponse, IWebToken } from "~/types"
import { apiAuth } from "@/api"
import { tokenExpired, tokenParser, tokenIsTOTP } from "@/utilities"

let refreshPromise: Promise<boolean> | null = null

export const useTokenStore = defineStore("tokens", {
  state: (): ITokenResponse => ({
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
      return Boolean(state.refresh_token) && !tokenExpired(state.refresh_token)
    },
    hasValidToken(): boolean {
      return (
        (this.hasActiveAccessToken || this.hasUsableRefreshToken) &&
        !tokenIsTOTP(this.token)
      )
    },
  },
  actions: {
    async getTokens(payload: { username: string; password?: string }) {
      const toast = useToast()
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
      let response
      try {
        if (payload.password !== undefined)
          response = await apiAuth.loginWithOauth(
            payload.username,
            payload.password,
          )
        else response = await apiAuth.loginWithMagicLink(payload.username)
        if (response) {
          if (Object.prototype.hasOwnProperty.call(response, "claim"))
            this.setMagicToken(response as unknown as IWebToken)
          else this.setTokens(response as unknown as ITokenResponse)
        } else throw "Error"
      } catch {
        toast.add({
          title: "Login error",
          description:
            "Please check your details, or internet connection, and try again.",
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
          const response = await apiAuth.validateMagicLink(token, {
            claim: data,
          })
          if (response) {
            this.setTokens(response as unknown as ITokenResponse)
          } else throw "Error"
        } else throw "Error"
      } catch {
        toast.add({
          title: "Login error",
          description:
            "Ensure you're using the same browser and that the token hasn't expired.",
          icon: "i-heroicons-exclamation-circle",
        })
        this.deleteTokens()
      }
    },
    async validateTOTPClaim(data: string) {
      const toast = useToast()
      try {
        const response = await apiAuth.loginWithTOTP(this.access_token, {
          claim: data,
        })
        if (response) {
          this.setTokens(response as unknown as ITokenResponse)
        } else throw "Error"
      } catch {
        toast.add({
          title: "Two-factor error",
          description:
            "Unable to validate your verification code. Make sure it is the latest.",
          icon: "i-heroicons-exclamation-circle",
        })
        this.deleteTokens()
      }
    },
    setMagicToken(payload: IWebToken) {
      this.access_token = payload.claim
    },
    setTokens(payload: ITokenResponse) {
      this.access_token = payload.access_token
      this.refresh_token = payload.refresh_token
      this.token_type = payload.token_type
    },
    async refreshTokens() {
      if (this.hasActiveAccessToken) return true
      if (!this.hasUsableRefreshToken) {
        this.deleteTokens()
        return false
      }
      if (refreshPromise) return await refreshPromise

      refreshPromise = apiAuth
        .getRefreshedToken(this.refresh)
        .then((response) => {
          this.setTokens(response)
          return true
        })
        .catch(() => {
          this.deleteTokens()
          return false
        })
        .finally(() => {
          refreshPromise = null
        })

      return await refreshPromise
    },
    // reset state using `$reset`
    deleteTokens() {
      this.$reset()
    },
  },
})
