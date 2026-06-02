import type {
  IUserProfile,
  IUserProfileUpdate,
  IEnableTOTP,
  IWebToken,
} from "~/types"
import { apiAuth } from "@/api"
import { tokenParser } from "@/utilities"

export const useAuthStore = defineStore("authUser", {
  state: (): IUserProfile => ({
    id: "",
    email: "",
    email_validated: false,
    is_active: false,
    is_superuser: false,
    full_name: "",
    hashed_password: false,
    totp_secret: false,
  }),
  persist: {
    storage: piniaPluginPersistedstate.cookies({
      maxAge: 60 * 60 * 24 * 90,
    }),
  },
  getters: {
    isAdmin: (state) => {
      return state.id && state.is_superuser && state.is_active
    },
    profile: (state) => state,
    loggedIn(): boolean {
      return Boolean(this.id) && this.tokenStore.hasValidToken
    },
    tokenStore: () => {
      return useTokenStore()
    },
  },
  actions: {
    // AUTHENTICATION
    async logIn(payload: { username: string; password?: string }) {
      const toast = useToast()
      try {
        await this.tokenStore.getTokens(payload)
        await this.getUserProfile()
      } catch {
        toast.add({
          title: "Login error",
          description:
            "Please check your details, or internet connection, and try again.",
          icon: "i-heroicons-exclamation-circle",
        })
        this.logOut()
      }
    },
    async magicLogin(token: string) {
      const toast = useToast()
      try {
        await this.tokenStore.validateMagicTokens(token)
        await this.getUserProfile()
      } catch {
        toast.add({
          title: "Login error",
          description:
            "Please check your details, or internet connection, and try again.",
          icon: "i-heroicons-exclamation-circle",
        })
        this.logOut()
      }
    },
    async totpLogin(claim: string) {
      const toast = useToast()
      try {
        await this.tokenStore.validateTOTPClaim(claim)
        await this.getUserProfile()
      } catch {
        toast.add({
          title: "Login error",
          description:
            "Please check your details, or internet connection, and try again.",
          icon: "i-heroicons-exclamation-circle",
        })
        this.logOut()
      }
    },
    // PROFILE MANAGEMENT
    async getUserProfile() {
      try {
        const { data: response } = await apiAuth.getProfile()
        if (response.value) this.setUserProfile(response.value)
        else this.logOut()
      } catch {
        this.logOut()
      }
    },
    async updateUserProfile(payload: IUserProfileUpdate) {
      const toast = useToast()
      if (this.loggedIn) {
        try {
          const response = await apiAuth.updateProfile(payload)
          if (response) {
            this.setUserProfile(response)
            toast.add({
              title: "Profile update",
              description: "Your settings have been updated.",
            })
          } else throw "Error"
        } catch {
          toast.add({
            title: "Profile update error",
            description:
              "Please check your submission, or internet connection, and try again.",
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    // MANAGING TOTP
    async enableTOTPAuthentication(payload: IEnableTOTP) {
      const toast = useToast()
      if (this.loggedIn) {
        try {
          const response = await apiAuth.enableTOTPAuthentication(payload)
          if (response) {
            this.totp_secret = true
            toast.add({
              title: "Two-factor authentication",
              description: response.msg,
            })
          } else throw "Error"
        } catch {
          toast.add({
            title: "Error enabling two-factor authentication",
            description:
              "Please check your submission, or internet connection, and try again.",
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    async disableTOTPAuthentication(payload: IUserProfileUpdate) {
      const toast = useToast()
      if (this.loggedIn) {
        try {
          const response = await apiAuth.disableTOTPAuthentication(payload)
          if (response) {
            this.totp_secret = false
            toast.add({
              title: "Two-factor authentication",
              description: response.msg,
            })
          } else throw "Error"
        } catch {
          toast.add({
            title: "Error disabling two-factor authentication",
            description:
              "Please check your submission, or internet connection, and try again.",
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    // mutations are actions, instead of `state` as first argument use `this`
    setUserProfile(payload: IUserProfile) {
      this.id = payload.id
      this.email = payload.email
      this.email_validated = payload.email_validated
      this.is_active = payload.is_active
      this.is_superuser = payload.is_superuser
      this.full_name = payload.full_name
      this.hashed_password = payload.hashed_password
      this.totp_secret = payload.totp_secret
    },
    async sendEmailValidation() {
      const toast = useToast()
      if (this.loggedIn && !this.email_validated) {
        try {
          const response = await apiAuth.requestValidationEmail()
          if (response) {
            toast.add({
              title: "Validation sent",
              description: response.msg,
            })
          }
        } catch {
          toast.add({
            title: "Validation error",
            description: "Please check your email and try again.",
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    async confirmEmail(validationToken: string) {
      const toast = useToast()
      try {
        const response = await apiAuth.confirmEmail(validationToken)
        if (response) {
          toast.add({
            title: "Success",
            description: response.msg,
          })
          return true
        }
      } catch {
        toast.add({
          title: "Validation error",
          description: "Invalid token. Check your email link and try again.",
          icon: "i-heroicons-exclamation-circle",
        })
      }
      return false
    },
    async recoverPassword(email: string) {
      const toast = useToast()
      if (!this.loggedIn) {
        try {
          const response = await apiAuth.recoverPassword(email)
          if (response) {
            if (Object.prototype.hasOwnProperty.call(response, "claim"))
              this.tokenStore.setMagicToken(response as unknown as IWebToken)
            toast.add({
              title: "Success",
              description:
                "If that login exists, we'll send you an email to reset your password.",
            })
          } else throw "Error"
        } catch {
          toast.add({
            title: "Login error",
            description:
              "Please check your details, or internet connection, and try again.",
            icon: "i-heroicons-exclamation-circle",
          })
          this.tokenStore.deleteTokens()
        }
      }
    },
    async resetPassword(password: string, token: string) {
      const toast = useToast()
      if (!this.loggedIn) {
        try {
          const claim: string = this.tokenStore.token
          // Check the two magic tokens meet basic criteria
          const localClaim = tokenParser(claim)
          const magicClaim = tokenParser(token)
          if (
            localClaim &&
            magicClaim &&
            Object.prototype.hasOwnProperty.call(localClaim, "fingerprint") &&
            Object.prototype.hasOwnProperty.call(magicClaim, "fingerprint") &&
            localClaim["fingerprint"] === magicClaim["fingerprint"]
          ) {
            const response = await apiAuth.resetPassword(password, claim, token)
            if (response)
              toast.add({
                title: "Success",
                description: response.msg,
              })
            else throw "Error"
          } else throw "Error"
        } catch {
          toast.add({
            title: "Login error",
            description:
              "Ensure you're using the same browser and that the token hasn't expired.",
            icon: "i-heroicons-exclamation-circle",
          })
          this.tokenStore.deleteTokens()
        }
      }
    },
    // reset state using `$reset`
    logOut() {
      this.tokenStore.deleteTokens()
      this.$reset()
    },
  },
})
