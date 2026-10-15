type AuthHooks = {
  getToken: () => string
  refresh: () => Promise<boolean>
  onUnauthorized: () => Promise<void>
  onForbidden: () => void
}

/** A transport per Nuxt app, with a single retry and a replayable request body. */
export function createAuthenticatedFetch(
  hooks: AuthHooks,
  fetcher?: typeof fetch,
): typeof fetch {
  return async (input, init) => {
    const original = new Request(input, init)
    const send = () => {
      const request = original.clone()
      const token = hooks.getToken()
      if (token) request.headers.set("Authorization", `Bearer ${token}`)
      request.headers.set("Cache-Control", "no-cache")
      return (fetcher ?? globalThis.fetch)(request)
    }

    let response = await send()
    if (response.status === 401) {
      if (await hooks.refresh()) response = await send()
      if (response.status === 401) await hooks.onUnauthorized()
    }
    if (response.status === 403) hooks.onForbidden()
    return response
  }
}
