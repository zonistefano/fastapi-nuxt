/** JWT-shaped tokens for tests: only the payload is meaningful. */
export function jwt(payload: Record<string, unknown>) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`
}

export function sessionTokens(sub = "user-1") {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token: jwt({ sub, exp }),
    refresh_token: jwt({ sub, exp, refresh: true }),
    token_type: "bearer",
  }
}
