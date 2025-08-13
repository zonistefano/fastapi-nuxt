import type {
  IUserProfile,
  IUserProfileUpdate,
  IUserOpenProfileCreate,
  IEnableTOTP,
  IWebToken,
} from "~/types"
import { apiAuth } from "@/api"
import { tokenIsTOTP, tokenParser } from "@/utilities"
import { useTokenStore } from "./tokens"

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
      // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html
      // https://nuxt.com/docs/api/composables/use-cookie#options
      // in seconds
      path: "/",
      secure: true,
      maxAge: 60 * 60 * 24 * 90,
      expires: new Date(new Date().getTime() + 60 * 60 * 24 * 90),
    }),
  },
  getters: {
    isAdmin: (state) => {
      return state.id && state.is_superuser && state.is_active
    },
    profile: (state) => state,
    loggedIn: (state) => state.id !== "",
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
        if (this.tokenStore.token && !tokenIsTOTP(this.tokenStore.token))
          await this.getUserProfile()
      } catch (error) {
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
        if (this.tokenStore.token && !tokenIsTOTP(this.tokenStore.token))
          await this.getUserProfile()
      } catch (error) {
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
        if (this.tokenStore.token && !tokenIsTOTP(this.tokenStore.token))
          await this.getUserProfile()
      } catch (error) {
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
    async createUserProfile(payload: IUserOpenProfileCreate) {
      const toast = useToast()
      try {
        const { data: response } = await apiAuth.createProfile(payload)
        if (response.value) this.setUserProfile(response.value)
        await this.tokenStore.getTokens({
          username: this.email,
          password: payload.password,
        })
      } catch (error) {
        toast.add({
          title: "Login creation error",
          description:
            "Please check your details, or internet connection, and try again.",
          icon: "i-heroicons-exclamation-circle",
        })
      }
    },
    async getUserProfile() {
      if (!this.loggedIn) {
        await this.tokenStore.refreshTokens()
        if (this.tokenStore.token) {
          try {
            const { data: response } = await apiAuth.getProfile(
              this.tokenStore.token,
            )
            if (response.value) this.setUserProfile(response.value)
          } catch (error) {
            this.logOut()
          }
        }
      }
    },
    async updateUserProfile(payload: IUserProfileUpdate) {
      const toast = useToast()
      await this.tokenStore.refreshTokens()
      if (this.loggedIn && this.tokenStore.token) {
        try {
          const { data: response } = await apiAuth.updateProfile(
            this.tokenStore.token,
            payload,
          )
          if (response.value)
            if (response.value) {
              this.setUserProfile(response.value)
              toast.add({
                title: "Profile update",
                description: "Your settings have been updated.",
              })
            } else throw "Error"
        } catch (error) {
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
      await this.tokenStore.refreshTokens()
      if (this.loggedIn && this.tokenStore.token) {
        try {
          const { data: response } = await apiAuth.enableTOTPAuthentication(
            this.tokenStore.token,
            payload,
          )
          if (response.value) {
            this.totp_secret = true
            toast.add({
              title: "Two-factor authentication",
              description: response.value.msg,
            })
          } else throw "Error"
        } catch (error) {
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
      await this.tokenStore.refreshTokens()
      if (this.loggedIn && this.tokenStore.token) {
        try {
          const { data: response } = await apiAuth.disableTOTPAuthentication(
            this.tokenStore.token,
            payload,
          )
          if (response.value) {
            this.totp_secret = false
            toast.add({
              title: "Two-factor authentication",
              description: response.value.msg,
            })
          } else throw "Error"
        } catch (error) {
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
      await this.tokenStore.refreshTokens()
      if (this.tokenStore.token && !this.email_validated) {
        try {
          const { data: response } = await apiAuth.requestValidationEmail(
            this.tokenStore.token,
          )
          if (response.value) {
            toast.add({
              title: "Validation sent",
              description: response.value.msg,
            })
          }
        } catch (error) {
          toast.add({
            title: "Validation error",
            description: "Please check your email and try again.",
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    async validateEmail(validationToken: string) {
      const toast = useToast()
      await this.tokenStore.refreshTokens()
      if (this.tokenStore.token && !this.email_validated) {
        try {
          const { data: response } = await apiAuth.validateEmail(
            this.tokenStore.token,
            validationToken,
          )
          if (response.value) {
            this.email_validated = true
            if (response.value) {
              toast.add({
                title: "Success",
                description: response.value.msg,
              })
            }
          }
        } catch (error) {
          toast.add({
            title: "Validation error",
            description:
              "Invalid token. Check your email and resend validation.",
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    async recoverPassword(email: string) {
      const toast = useToast()
      if (!this.loggedIn) {
        try {
          const { data: response } = await apiAuth.recoverPassword(email)
          if (response.value) {
            if (Object.prototype.hasOwnProperty.call(response.value, "claim"))
              this.tokenStore.setMagicToken(
                response.value as unknown as IWebToken,
              )
            toast.add({
              title: "Success",
              description:
                "If that login exists, we'll send you an email to reset your password.",
            })
          } else throw "Error"
        } catch (error) {
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
            Object.prototype.hasOwnProperty.call(localClaim, "fingerprint") &&
            Object.prototype.hasOwnProperty.call(magicClaim, "fingerprint") &&
            localClaim["fingerprint"] === magicClaim["fingerprint"]
          ) {
            const { data: response } = await apiAuth.resetPassword(
              password,
              claim,
              token,
            )
            if (response.value)
              toast.add({
                title: "Success",
                description: response.value.msg,
              })
            else throw "Error"
          }
        } catch (error) {
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
