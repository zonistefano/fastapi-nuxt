import {
  loginConfirmEmail,
  loginDisableTotpAuthentication,
  loginEnableTotpAuthentication,
  loginRecoverPassword,
  loginResetPassword,
  usersReadUserMe,
  usersSendValidationEmail,
  usersUpdateUserMe,
} from "~/api/generated"
import type {
  CustomUserRead,
  CustomUserUpdate,
  EnableTotp,
} from "~/api/generated"
import { tokenParser, translate as t } from "@/utilities"

export const useAuthStore = defineStore("authUser", {
  state: () => ({
    id: "",
    email: "",
    email_validated: false,
    is_active: false,
    is_superuser: false,
    full_name: "",
    hashed_password: false,
    totp_secret: false,
    created: "",
    modified: "",
    language: "en",
    role: "user",
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
      const nuxtApp = useNuxtApp()
      const toast = useToast()
      try {
        await this.tokenStore.getTokens(payload)
        await nuxtApp.runWithContext(() => this.getUserProfile())
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.loginErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.logOut()
      }
    },
    async magicLogin(token: string) {
      const nuxtApp = useNuxtApp()
      const toast = useToast()
      try {
        await this.tokenStore.validateMagicTokens(token)
        await nuxtApp.runWithContext(() => this.getUserProfile())
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.loginErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.logOut()
      }
    },
    async totpLogin(claim: string) {
      const nuxtApp = useNuxtApp()
      const toast = useToast()
      try {
        await this.tokenStore.validateTOTPClaim(claim)
        await nuxtApp.runWithContext(() => this.getUserProfile())
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.loginErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.logOut()
      }
    },
    // PROFILE MANAGEMENT
    async getUserProfile() {
      try {
        const response = await usersReadUserMe({ client: useNuxtApp().$api })
        if (response) this.setUserProfile(response)
        else this.logOut()
      } catch {
        this.logOut()
      }
    },
    async updateUserProfile(payload: CustomUserUpdate) {
      const toast = useToast()
      if (this.loggedIn) {
        try {
          const credentialsChanged = Boolean(
            payload.password || (payload.email && payload.email !== this.email),
          )
          const response = await usersUpdateUserMe({
            client: useNuxtApp().$api,
            body: payload,
          })
          if (response) {
            this.setUserProfile(response)
            toast.add({
              title: t("notifications.profileUpdated"),
              description: t("notifications.profileUpdatedDescription"),
            })
            if (credentialsChanged) {
              this.logOut()
              await navigateTo("/login")
            }
          } else throw "Error"
        } catch {
          toast.add({
            title: t("notifications.profileUpdateError"),
            description: t("notifications.submissionErrorDescription"),
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    // MANAGING TOTP
    async enableTOTPAuthentication(payload: EnableTotp) {
      const toast = useToast()
      if (this.loggedIn) {
        try {
          const response = await loginEnableTotpAuthentication({
            client: useNuxtApp().$api,
            body: payload,
          })
          if (response) {
            this.tokenStore.setTokens(response.tokens)
            this.totp_secret = true
            toast.add({
              title: t("notifications.twoFactor"),
              description: response.msg,
            })
            return response.recovery_codes
          } else throw "Error"
        } catch {
          toast.add({
            title: t("notifications.enableTwoFactorError"),
            description: t("notifications.submissionErrorDescription"),
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    async disableTOTPAuthentication(payload: CustomUserUpdate) {
      const toast = useToast()
      if (this.loggedIn) {
        try {
          const response = await loginDisableTotpAuthentication({
            client: useNuxtApp().$api,
            body: payload,
          })
          if (response) {
            this.tokenStore.setTokens(response.tokens)
            this.totp_secret = false
            toast.add({
              title: t("notifications.twoFactor"),
              description: response.msg,
            })
          } else throw "Error"
        } catch {
          toast.add({
            title: t("notifications.disableTwoFactorError"),
            description: t("notifications.submissionErrorDescription"),
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    // mutations are actions, instead of `state` as first argument use `this`
    setUserProfile(payload: CustomUserRead) {
      this.id = payload.id
      this.email = payload.email
      this.email_validated = payload.email_validated ?? false
      this.is_active = payload.is_active ?? false
      this.is_superuser = payload.is_superuser ?? false
      this.full_name = payload.full_name ?? ""
      this.hashed_password = payload.hashed_password ?? false
      this.totp_secret = payload.totp ?? false
      this.created = payload.created
      this.modified = payload.modified
      this.language = payload.language
      this.role = payload.role ?? "user"
    },
    async sendEmailValidation() {
      const toast = useToast()
      if (this.loggedIn && !this.email_validated) {
        try {
          const response = await usersSendValidationEmail({
            client: useNuxtApp().$api,
          })
          if (response) {
            toast.add({
              title: t("notifications.validationSent"),
              description: response.msg,
            })
          }
        } catch {
          toast.add({
            title: t("notifications.validationError"),
            description: t("notifications.validationErrorDescription"),
            icon: "i-heroicons-exclamation-circle",
          })
        }
      }
    },
    async confirmEmail(validationToken: string) {
      const toast = useToast()
      try {
        const response = await loginConfirmEmail({
          client: useNuxtApp().$publicApi,
          query: { token: validationToken },
        })
        if (response) {
          toast.add({
            title: t("common.success"),
            description: response.msg,
          })
          return true
        }
      } catch {
        toast.add({
          title: t("notifications.validationError"),
          description: t("notifications.invalidTokenDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
      }
      return false
    },
    async recoverPassword(email: string) {
      const toast = useToast()
      if (!this.loggedIn) {
        try {
          const response = await loginRecoverPassword({
            client: useNuxtApp().$publicApi,
            path: { email },
          })
          if (response) {
            this.tokenStore.setMagicToken(response)
            toast.add({
              title: t("common.success"),
              description: t("notifications.recoveryDescription"),
            })
          } else throw "Error"
        } catch {
          toast.add({
            title: t("notifications.loginError"),
            description: t("notifications.loginErrorDescription"),
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
            const response = await loginResetPassword({
              client: useNuxtApp().$publicApi,
              body: { new_password: password, claim },
              headers: { Authorization: `Bearer ${token}` },
            })
            if (response)
              toast.add({
                title: t("common.success"),
                description: response.msg,
              })
            else throw "Error"
          } else throw "Error"
        } catch {
          toast.add({
            title: t("notifications.loginError"),
            description: t("notifications.sameBrowserDescription"),
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
