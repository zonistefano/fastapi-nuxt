import { beforeEach, describe, expect, test } from "bun:test"
import type { CustomUserRead } from "~/api/generated"
import {
  jwt,
  mockApi,
  navigations,
  requests,
  resetNuxt,
  sessionTokens,
  toasts,
} from "../fakes"

const user: CustomUserRead = {
  id: "user-1",
  email: "a@example.com",
  email_validated: true,
  is_active: true,
  is_superuser: false,
  full_name: "Ada",
  hashed_password: true,
  totp: false,
  created: "2026-01-01T00:00:00Z",
  modified: "2026-01-02T00:00:00Z",
  language: "it",
  role: "user",
}

const error =
  (status = 400) =>
  () =>
    Response.json({ detail: "Error" }, { status })

function signIn(profile: Partial<CustomUserRead> = {}) {
  useTokenStore().setTokens(sessionTokens())
  const auth = useAuthStore()
  auth.setUserProfile({ ...user, ...profile })
  return auth
}

const totpChallenge = () =>
  jwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60, totp: true })

beforeEach(() => resetNuxt())

describe("profile state", () => {
  test("maps the API profile and applies defaults", () => {
    const auth = useAuthStore()
    auth.setUserProfile({
      id: "user-2",
      email: "b@example.com",
      created: "c",
      modified: "m",
      language: "en",
      role: null,
    })
    expect(auth.profile).toMatchObject({
      id: "user-2",
      email_validated: false,
      is_active: false,
      is_superuser: false,
      full_name: "",
      hashed_password: false,
      totp_secret: false,
      role: "user",
    })
  })

  test("loggedIn requires both a profile and a session token", () => {
    const auth = useAuthStore()
    auth.setUserProfile(user)
    expect(auth.loggedIn).toBe(false)
    useTokenStore().setTokens(sessionTokens())
    expect(auth.loggedIn).toBe(true)
  })

  test("isAdmin requires an active superuser", () => {
    expect(Boolean(signIn().isAdmin)).toBe(false)
    expect(
      Boolean(signIn({ is_superuser: true, is_active: false }).isAdmin),
    ).toBe(false)
    expect(Boolean(signIn({ is_superuser: true }).isAdmin)).toBe(true)
  })

  test("logOut clears profile and tokens", () => {
    const auth = signIn()
    auth.logOut()
    expect(auth.id).toBe("")
    expect(useTokenStore().access_token).toBe("")
  })
})

describe("logIn", () => {
  test("stores the tokens and loads the profile", async () => {
    mockApi("POST /login/oauth", sessionTokens())
    mockApi("GET /users/me", user)
    const auth = useAuthStore()
    await auth.logIn({ username: user.email, password: "secret" })
    expect(auth.loggedIn).toBe(true)
    expect(auth.full_name).toBe("Ada")
  })

  test("keeps the TOTP challenge without requesting the profile", async () => {
    const challenge = totpChallenge()
    mockApi("POST /login/oauth", {
      access_token: challenge,
      refresh_token: null,
      token_type: "bearer",
    })
    const auth = useAuthStore()
    await auth.logIn({ username: user.email, password: "secret" })
    expect(useTokenStore().token).toBe(challenge)
    expect(auth.loggedIn).toBe(false)
    expect(requests.map((r) => new URL(r.url).pathname)).toEqual([
      "/login/oauth",
    ])
  })

  test("keeps the magic-link claim without requesting the profile", async () => {
    const claim = jwt({ sub: "claim", fingerprint: "fp-1" })
    mockApi("POST /login/magic/a%40example.com", { claim })
    await useAuthStore().logIn({ username: user.email })
    expect(useTokenStore().token).toBe(claim)
    expect(requests).toHaveLength(1)
  })

  test("logs out when the profile cannot be loaded", async () => {
    mockApi("POST /login/oauth", sessionTokens())
    mockApi("GET /users/me", error(500))
    const auth = useAuthStore()
    await auth.logIn({ username: user.email, password: "secret" })
    expect(auth.loggedIn).toBe(false)
    expect(useTokenStore().access_token).toBe("")
  })

  test("notifies once when the credentials are wrong", async () => {
    mockApi("POST /login/oauth", error(400))
    await useAuthStore().logIn({ username: user.email, password: "wrong" })
    expect(toasts).toHaveLength(1)
    expect(requests).toHaveLength(1)
  })
})

describe("second-step logins", () => {
  test("magicLogin loads the profile after a valid claim", async () => {
    const tokens = useTokenStore()
    tokens.setMagicToken({ claim: jwt({ fingerprint: "fp-1" }) })
    mockApi("POST /login/claim", sessionTokens())
    mockApi("GET /users/me", user)
    const auth = useAuthStore()
    await auth.magicLogin(jwt({ sub: "user-1", fingerprint: "fp-1" }))
    expect(auth.loggedIn).toBe(true)
  })

  test("magicLogin stops at the TOTP challenge", async () => {
    const challenge = totpChallenge()
    useTokenStore().setMagicToken({ claim: jwt({ fingerprint: "fp-1" }) })
    mockApi("POST /login/claim", {
      access_token: challenge,
      refresh_token: null,
      token_type: "bearer",
    })
    await useAuthStore().magicLogin(jwt({ fingerprint: "fp-1" }))
    expect(useTokenStore().token).toBe(challenge)
    expect(requests).toHaveLength(1)
  })

  test("totpLogin loads the profile after a valid code", async () => {
    useTokenStore().setMagicToken({ claim: totpChallenge() })
    mockApi("POST /login/totp", sessionTokens())
    mockApi("GET /users/me", user)
    const auth = useAuthStore()
    await auth.totpLogin("123456")
    expect(auth.loggedIn).toBe(true)
  })

  test("totpLogin leaves the user logged out on a wrong code", async () => {
    useTokenStore().setMagicToken({ claim: totpChallenge() })
    mockApi("POST /login/totp", error(400))
    const auth = useAuthStore()
    await auth.totpLogin("000000")
    expect(auth.loggedIn).toBe(false)
    expect(requests).toHaveLength(1)
  })
})

describe("unexpected login errors", () => {
  test.each([
    ["logIn", "getTokens"],
    ["magicLogin", "validateMagicTokens"],
    ["totpLogin", "validateTOTPClaim"],
  ] as const)("%s notifies and logs out", async (login, step) => {
    const auth = signIn()
    Object.assign(useTokenStore(), {
      [step]: () => Promise.reject(new Error("boom")),
    })
    await (auth[login] as (arg: never) => Promise<void>)({} as never)
    expect(auth.loggedIn).toBe(false)
    expect(toasts[0]!.title).toBe("notifications.loginError")
  })
})

describe("getUserProfile", () => {
  test("logs out when the response is empty", async () => {
    signIn()
    mockApi("GET /users/me", () => new Response(null, { status: 200 }))
    const auth = useAuthStore()
    await auth.getUserProfile()
    expect(auth.id).toBe("")
  })
})

describe("updateUserProfile", () => {
  test("does nothing when logged out", async () => {
    await useAuthStore().updateUserProfile({ full_name: "Grace" })
    expect(requests).toHaveLength(0)
  })

  test("updates the profile and keeps the session", async () => {
    const auth = signIn()
    mockApi("PUT /users/me", { ...user, full_name: "Grace" })
    await auth.updateUserProfile({ full_name: "Grace" })
    expect(await requests[0]!.json()).toEqual({ full_name: "Grace" })
    expect(auth.full_name).toBe("Grace")
    expect(auth.loggedIn).toBe(true)
    expect(toasts[0]!.title).toBe("notifications.profileUpdated")
    expect(navigations).toHaveLength(0)
  })

  test.each([{ password: "new-password" }, { email: "new@example.com" }])(
    "logs out after a credential change %p",
    async (payload) => {
      const auth = signIn()
      mockApi("PUT /users/me", { ...user, ...payload })
      await auth.updateUserProfile(payload)
      expect(auth.loggedIn).toBe(false)
      expect(navigations).toEqual(["/login"])
    },
  )

  test("keeps the session when the email is unchanged", async () => {
    const auth = signIn()
    mockApi("PUT /users/me", user)
    await auth.updateUserProfile({ email: user.email })
    expect(auth.loggedIn).toBe(true)
  })

  test("notifies on failure", async () => {
    const auth = signIn()
    mockApi("PUT /users/me", error())
    await auth.updateUserProfile({ full_name: "Grace" })
    expect(auth.full_name).toBe("Ada")
    expect(toasts[0]!.title).toBe("notifications.profileUpdateError")
  })
})

describe("TOTP management", () => {
  const renewed = () => ({ msg: "Done", tokens: sessionTokens() })

  test("enabling stores the new tokens and returns the recovery codes", async () => {
    const auth = signIn()
    const response = { ...renewed(), recovery_codes: ["a", "b"] }
    mockApi("PUT /login/totp", response)
    const codes = await auth.enableTOTPAuthentication({
      claim: "123456",
      uri: "otpauth://totp/x",
    })
    expect(codes).toEqual(["a", "b"])
    expect(auth.totp_secret).toBe(true)
    expect(useTokenStore().access_token).toBe(response.tokens.access_token)
    expect(toasts[0]!.description).toBe("Done")
  })

  test("enabling notifies on failure", async () => {
    const auth = signIn()
    mockApi("PUT /login/totp", error())
    expect(
      await auth.enableTOTPAuthentication({ claim: "0", uri: "x" }),
    ).toBeUndefined()
    expect(auth.totp_secret).toBe(false)
    expect(toasts[0]!.title).toBe("notifications.enableTwoFactorError")
  })

  test("disabling stores the new tokens", async () => {
    const auth = signIn({ totp: true })
    mockApi("DELETE /login/totp", renewed())
    await auth.disableTOTPAuthentication({ password: "secret" })
    expect(auth.totp_secret).toBe(false)
    expect(await requests[0]!.json()).toEqual({ password: "secret" })
  })

  test("disabling notifies on failure", async () => {
    const auth = signIn({ totp: true })
    mockApi("DELETE /login/totp", error())
    await auth.disableTOTPAuthentication({ password: "wrong" })
    expect(auth.totp_secret).toBe(true)
    expect(toasts[0]!.title).toBe("notifications.disableTwoFactorError")
  })

  test("is not available when logged out", async () => {
    const auth = useAuthStore()
    await auth.enableTOTPAuthentication({ claim: "0", uri: "x" })
    await auth.disableTOTPAuthentication({})
    expect(requests).toHaveLength(0)
  })
})

describe("email validation", () => {
  test("sends the validation email only to unvalidated users", async () => {
    mockApi("POST /users/send-validation-email", { msg: "Sent" })
    await signIn().sendEmailValidation()
    expect(requests).toHaveLength(0)
    await signIn({ email_validated: false }).sendEmailValidation()
    expect(requests).toHaveLength(1)
    expect(toasts[0]!.description).toBe("Sent")
  })

  test("notifies when the validation email fails", async () => {
    mockApi("POST /users/send-validation-email", error(429))
    await signIn({ email_validated: false }).sendEmailValidation()
    expect(toasts[0]!.title).toBe("notifications.validationError")
  })

  test("confirms the email token", async () => {
    mockApi("GET /login/confirm-email", { msg: "Confirmed" })
    expect(await useAuthStore().confirmEmail("email-token")).toBe(true)
    expect(new URL(requests[0]!.url).searchParams.get("token")).toBe(
      "email-token",
    )
  })

  test("reports an invalid email token", async () => {
    mockApi("GET /login/confirm-email", error())
    expect(await useAuthStore().confirmEmail("bad")).toBe(false)
    expect(toasts[0]!.description).toBe("notifications.invalidTokenDescription")
  })
})

describe("password recovery", () => {
  test("stores the recovery claim", async () => {
    const claim = jwt({ fingerprint: "fp-1" })
    mockApi("POST /login/recover/a%40example.com", { claim })
    await useAuthStore().recoverPassword(user.email)
    expect(useTokenStore().token).toBe(claim)
    expect(toasts[0]!.description).toBe("notifications.recoveryDescription")
  })

  test("notifies when recovery fails", async () => {
    mockApi("POST /login/recover/a%40example.com", error(429))
    await useAuthStore().recoverPassword(user.email)
    expect(useTokenStore().token).toBe("")
    expect(toasts[0]!.title).toBe("notifications.loginError")
  })

  test("resets the password with matching fingerprints", async () => {
    const claim = jwt({ fingerprint: "fp-1" })
    const emailed = jwt({ sub: "user-1", fingerprint: "fp-1" })
    useTokenStore().setMagicToken({ claim })
    mockApi("POST /login/reset", { msg: "Password updated" })
    await useAuthStore().resetPassword("new-password", emailed)
    expect(requests[0]!.headers.get("Authorization")).toBe(`Bearer ${emailed}`)
    expect(await requests[0]!.json()).toEqual({
      new_password: "new-password",
      claim,
    })
    expect(toasts[0]!.description).toBe("Password updated")
  })

  test("refuses a reset link from another browser", async () => {
    useTokenStore().setMagicToken({ claim: jwt({ fingerprint: "fp-1" }) })
    await useAuthStore().resetPassword("x", jwt({ fingerprint: "fp-2" }))
    expect(requests).toHaveLength(0)
    expect(useTokenStore().token).toBe("")
    expect(toasts[0]!.description).toBe("notifications.sameBrowserDescription")
  })

  test("recovery and reset are not available when logged in", async () => {
    const auth = signIn()
    await auth.recoverPassword(user.email)
    await auth.resetPassword("x", jwt({ fingerprint: "fp-1" }))
    expect(requests).toHaveLength(0)
  })
})
