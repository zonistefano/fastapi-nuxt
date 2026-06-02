import type {
  IUserProfile,
  IUserProfileUpdate,
  IUserProfileCreate,
  IUserOpenProfileCreate,
  ITokenResponse,
  IWebToken,
  INewTOTP,
  IEnableTOTP,
  IMsg,
} from "~/types"
import { apiCore } from "./core"

export const apiAuth = {
  // TEST
  async getTestText() {
    return await useFetch<IMsg>(`${apiCore.url()}/users/tester`)
  },
  // LOGIN WITH MAGIC LINK OR OAUTH2 (USERNAME/PASSWORD)
  async loginWithMagicLink(email: string) {
    return await $fetch<IWebToken>(`${apiCore.url()}/login/magic/${email}`, {
      method: "POST",
    })
  },
  async validateMagicLink(token: string, data: IWebToken) {
    return await $fetch<ITokenResponse>(`${apiCore.url()}/login/claim`, {
      method: "POST",
      body: data,
      headers: apiCore.headers(token),
    })
  },
  async loginWithOauth(username: string, password: string) {
    // Version of this: https://github.com/unjs/ofetch/issues/37#issuecomment-1262226065
    // useFetch is borked, so you'll need to ignore errors https://github.com/unjs/ofetch/issues/37
    const params = new URLSearchParams()
    params.append("username", username)
    params.append("password", password)
    return await $fetch<ITokenResponse>(`${apiCore.url()}/login/oauth`, {
      method: "POST",
      body: params,
      // @ts-expect-error: Content-Disposition is not seen as a valid header
      headers: { "Content-Disposition": params },
    })
  },
  // TOTP SETUP AND AUTHENTICATION
  async loginWithTOTP(token: string, data: IWebToken) {
    return await $fetch<ITokenResponse>(`${apiCore.url()}/login/totp`, {
      method: "POST",
      body: data,
      headers: apiCore.headers(token),
    })
  },
  async requestNewTOTP() {
    return await apiCore.request<INewTOTP>("/login/new-totp", {
      method: "POST",
    })
  },
  async enableTOTPAuthentication(data: IEnableTOTP) {
    return await apiCore.request<IMsg>("/login/totp", {
      method: "PUT",
      body: data,
    })
  },
  async disableTOTPAuthentication(data: IUserProfileUpdate) {
    return await apiCore.request<IMsg>("/login/totp", {
      method: "DELETE",
      body: data,
    })
  },
  // MANAGE JWT TOKENS (REFRESH / REVOKE)
  async getRefreshedToken(token: string) {
    return await $fetch<ITokenResponse>(`${apiCore.url()}/login/refresh`, {
      method: "POST",
      headers: apiCore.headers(token),
    })
  },
  async revokeRefreshedToken() {
    return await apiCore.request<IMsg>("/login/revoke", {
      method: "POST",
    })
  },
  // USER PROFILE MANAGEMENT
  async createProfile(data: IUserOpenProfileCreate) {
    return await $fetch<IUserProfile | IMsg>(`${apiCore.url()}/login/signup`, {
      method: "POST",
      body: data,
    })
  },
  async getProfile() {
    return await apiCore.useRequest<IUserProfile>("/users/me", {
      key: "user-profile",
    })
  },
  async updateProfile(data: IUserProfileUpdate) {
    return await apiCore.request<IUserProfile>("/users/me", {
      method: "PUT",
      body: data,
    })
  },
  // ACCOUNT RECOVERY
  async recoverPassword(email: string) {
    return await $fetch<IMsg | IWebToken>(
      `${apiCore.url()}/login/recover/${email}`,
      {
        method: "POST",
      },
    )
  },
  async resetPassword(password: string, claim: string, token: string) {
    return await $fetch<IMsg>(`${apiCore.url()}/login/reset`, {
      method: "POST",
      body: {
        new_password: password,
        claim,
      },
      headers: apiCore.headers(token),
    })
  },
  async requestValidationEmail() {
    return await apiCore.request<IMsg>("/users/send-validation-email", {
      method: "POST",
    })
  },
  async confirmEmail(token: string) {
    return await $fetch<IMsg>(`${apiCore.url()}/login/confirm-email`, {
      method: "GET",
      query: { token },
    })
  },
  // ADMIN USER MANAGEMENT
  async getAllUsers() {
    return await apiCore.useRequest<IUserProfile[]>("/users/", {
      key: "users",
    })
  },
  async toggleUserState(data: IUserProfileUpdate) {
    return await apiCore.request<IMsg>("/users/toggle-state", {
      method: "POST",
      body: data,
    })
  },
  async createUserProfile(data: IUserProfileCreate) {
    return await apiCore.request<IUserProfile>("/users/create", {
      method: "POST",
      body: data,
    })
  },
  async updateUserById(id: string, data: IUserProfileUpdate) {
    return await apiCore.request<IUserProfile>(`/users/${id}`, {
      method: "POST",
      body: data,
    })
  },
}
