type PreferenceStorage = Pick<Storage, "getItem" | "setItem">

const preferenceKey = (userId: string) => `passkey-enrollment:${userId}`

export function passkeyEnrollmentDeferred(
  userId: string,
  storage?: PreferenceStorage,
  now = Date.now(),
): boolean {
  try {
    const until = Number(
      (storage ?? globalThis.localStorage).getItem(preferenceKey(userId)),
    )
    return Number.isFinite(until) && until > now
  } catch {
    return false
  }
}

export function deferPasskeyEnrollment(
  userId: string,
  days: number,
  storage?: PreferenceStorage,
  now = Date.now(),
) {
  const cooldown = Number.isFinite(days) && days > 0 ? days : 30
  try {
    const preferences = storage ?? globalThis.localStorage
    preferences.setItem(
      preferenceKey(userId),
      String(now + cooldown * 86_400_000),
    )
  } catch {
    // A browser may deny storage; the current invitation is still dismissed.
  }
}

export function passkeyCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NotAllowedError" || error.name === "AbortError")
  )
}
