import type { SocialAuthorizationUrl, Token } from "~/api/generated"

export function socialPopup(
  authorize: () => Promise<SocialAuthorizationUrl>,
  apiOrigin: string,
): Promise<Token> {
  const popup = window.open("about:blank", "_blank", "width=520,height=700")
  if (!popup) return Promise.reject(new Error("Popup blocked"))
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      window.removeEventListener("message", receive)
      window.clearInterval(timer)
      popup.close()
    }
    const fail = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error("Social authentication failed"))
    }
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== apiOrigin ||
        event.source !== popup ||
        event.data?.type !== "auth:social"
      )
        return
      const tokens = event.data.tokens
      if (
        "error" in event.data ||
        typeof tokens?.access_token !== "string" ||
        tokens.access_token.length === 0 ||
        typeof tokens.token_type !== "string" ||
        (tokens.refresh_token != null &&
          typeof tokens.refresh_token !== "string")
      )
        return fail()
      settled = true
      cleanup()
      resolve(tokens)
    }
    const deadline = Date.now() + 300_000
    const timer = window.setInterval(() => {
      if (popup.closed || Date.now() > deadline) fail()
    }, 500)
    window.addEventListener("message", receive)
    authorize()
      .then(({ url }) => {
        if (settled) return
        const destination = new URL(url)
        if (!["https:", "http:"].includes(destination.protocol)) return fail()
        popup.location.href = destination.href
      })
      .catch(fail)
  })
}
