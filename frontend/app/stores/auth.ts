import {
  loginConfirmEmail,
  loginAuthenticationOptions,
  loginAuthenticationVerify,
  loginFastapiMyauthSocialLogin,
  loginFastapiMyauthSocialLink,
  loginDisableTotpAuthentication,
  loginEnableTotpAuthentication,
  loginRecoverPassword,
  loginResetPassword,
  loginReauthenticate,
  loginRegenerateRecoveryCodes,
  loginLogoutAll,
  loginRevokeRefreshToken,
  usersDeleteUserMe,
  usersReadUserMe,
  usersSendValidationEmail,
  usersUpdateUserMe,
} from "~/api/generated"
import type {
  CustomUserRead,
  CustomUserUpdate,
  EnableTotp,
  Reauthentication,
} from "~/api/generated"
import { tokenParser, translate as t } from "@/utilities"
import { socialPopup } from "~/utilities/social"
import { passkeyCancelled } from "~/utilities/passkeys"
import { startAuthentication } from "@simplewebauthn/browser"
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser"

export const useAuthStore = defineStore("authUser", {
  state: () => ({
    passkeyEnrollmentPending: false,
    passkeyTotpChallenge: false,
    reauthenticationRequired: false,
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
    omit: ["reauthenticationRequired", "passkeyEnrollmentPending"],
    storage: piniaPluginPersistedstate.cookies({
      maxAge: 60 * 60 * 24 * 90,
    }),
  },
  getters: {
    isAdmin(): boolean {
      return (
        this.loggedIn &&
        this.is_active &&
        (this.is_superuser || this.role === "admin")
      )
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
        this.passkeyTotpChallenge = false
        await this.tokenStore.getTokens(payload)
        if (this.tokenStore.hasValidToken)
          await nuxtApp.runWithContext(() => this.getUserProfile())
        this.passkeyEnrollmentPending = this.loggedIn
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.loginErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.clearSession()
      }
    },
    async magicLogin(token: string) {
      const nuxtApp = useNuxtApp()
      const toast = useToast()
      try {
        this.passkeyTotpChallenge = false
        await this.tokenStore.validateMagicTokens(token)
        if (this.tokenStore.hasValidToken)
          await nuxtApp.runWithContext(() => this.getUserProfile())
        this.passkeyEnrollmentPending = this.loggedIn
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.loginErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.clearSession()
      }
    },
    async totpLogin(claim: string, recovery = false) {
      const nuxtApp = useNuxtApp()
      const toast = useToast()
      try {
        await this.tokenStore.validateTOTPClaim(claim, recovery)
        if (this.tokenStore.hasValidToken)
          await nuxtApp.runWithContext(() => this.getUserProfile())
        this.passkeyEnrollmentPending =
          this.loggedIn && !this.passkeyTotpChallenge
        if (this.loggedIn) this.passkeyTotpChallenge = false
      } catch {
        toast.add({
          title: t("notifications.loginError"),
          description: t("notifications.loginErrorDescription"),
          icon: "i-heroicons-exclamation-circle",
        })
        this.clearSession()
      }
    },
    async passkeyLogin({
      autofill = false,
      signal,
    }: { autofill?: boolean; signal?: AbortSignal } = {}) {
      const nuxtApp = useNuxtApp()
      const toast = useToast()
      try {
        const client = nuxtApp.$publicApi
        const challenge = await loginAuthenticationOptions({ client, signal })
        if (signal?.aborted) return false
        const credential = await startAuthentication({
          optionsJSON:
            challenge.options as unknown as PublicKeyCredentialRequestOptionsJSON,
          useBrowserAutofill: autofill,
        })
        if (signal?.aborted) return false
        const tokens = await loginAuthenticationVerify({
          client,
          signal,
          body: {
            ceremony_id: challenge.ceremony_id,
            credential: { ...credential },
          },
        })
        if (signal?.aborted) return false
        this.passkeyEnrollmentPending = false
        this.passkeyTotpChallenge = true
        this.tokenStore.setTokens(tokens)
        if (this.tokenStore.hasValidToken)
          await nuxtApp.runWithContext(() => this.getUserProfile())
        if (this.loggedIn) this.passkeyTotpChallenge = false
        return true
      } catch (error) {
        if (!signal?.aborted && !autofill && !passkeyCancelled(error))
          toast.add({ title: t("notifications.loginError"), color: "error" })
        return false
      }
    },
    async socialLogin(provider: string, link = false) {
      const nuxtApp = useNuxtApp()
      const toast = useToast()
      const apiOrigin = new URL(useRuntimeConfig().public.apiUrl).origin
      try {
        const tokens = await socialPopup(
          () =>
            link
              ? loginFastapiMyauthSocialLink({
                  client: nuxtApp.$api,
                  path: { provider },
                  credentials: "include",
                })
              : loginFastapiMyauthSocialLogin({
                  client: nuxtApp.$publicApi,
                  path: { provider },
                  credentials: "include",
                }),
          apiOrigin,
        )
        this.tokenStore.setTokens(tokens)
        if (this.tokenStore.hasValidToken)
          await nuxtApp.runWithContext(() => this.getUserProfile())
        if (!link) {
          this.passkeyTotpChallenge = false
          this.passkeyEnrollmentPending = this.loggedIn
        }
      } catch {
        toast.add({ title: t("notifications.loginError"), color: "error" })
      }
    },
    // PROFILE MANAGEMENT
    async getUserProfile() {
      if (!this.tokenStore.hasValidToken) {
        this.$reset()
        return
      }
      try {
        const response = await usersReadUserMe({ client: useNuxtApp().$api })
        if (response) this.setUserProfile(response)
        else this.clearSession()
      } catch {
        this.clearSession()
      }
    },
    async updateUserProfile(payload: CustomUserUpdate) {
      const toast = useToast()
      const localePath = useLocalePath()
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
              this.clearSession()
              await navigateTo(localePath("/login"))
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
            if (response) {
              this.tokenStore.deleteTokens()
              toast.add({
                title: t("common.success"),
                description: response.msg,
              })
              return true
            } else throw "Error"
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
    async reauthenticate(payload: Reauthentication) {
      const toast = useToast()
      try {
        const response = await loginReauthenticate({
          client: useNuxtApp().$api,
          body: payload,
        })
        this.tokenStore.setTokens(response)
        this.reauthenticationRequired = false
        return true
      } catch {
        toast.add({ title: t("auth.reauth.error"), color: "error" })
        return false
      }
    },
    async regenerateRecoveryCodes() {
      const toast = useToast()
      try {
        const response = await loginRegenerateRecoveryCodes({
          client: useNuxtApp().$api,
        })
        this.tokenStore.setTokens(response.tokens)
        return response.recovery_codes
      } catch {
        toast.add({
          title: t("notifications.updateError"),
          color: "error",
        })
      }
    },
    async logOut(all = false) {
      const toast = useToast()
      const client = useNuxtApp().$publicApi
      const token = all ? this.tokenStore.token : this.tokenStore.refresh
      if (all) {
        try {
          await loginLogoutAll({ client: useNuxtApp().$api })
        } catch {
          toast.add({
            title: t("notifications.updateError"),
            color: "error",
          })
          return false
        }
      }
      this.clearSession()
      if (!all && token) {
        try {
          await loginRevokeRefreshToken({
            client,
            headers: { Authorization: `Bearer ${token}` },
          })
        } catch {
          toast.add({
            title: t("auth.session.revokeError"),
            color: "error",
          })
        }
      }
      return true
    },
    async deleteAccount() {
      const toast = useToast()
      const localePath = useLocalePath()
      try {
        await usersDeleteUserMe({ client: useNuxtApp().$api })
        this.clearSession()
        await navigateTo(localePath("/"))
      } catch {
        toast.add({
          title: t("notifications.updateError"),
          color: "error",
        })
      }
    },
    clearSession() {
      this.tokenStore.deleteTokens()
      this.$reset()
    },
  },
})
