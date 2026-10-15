import { expect, test } from "bun:test"
import {
  deferPasskeyEnrollment,
  passkeyCancelled,
  passkeyEnrollmentDeferred,
} from "~/utilities/passkeys"

test("defers enrollment for the configured time and isolates accounts", () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  expect(passkeyEnrollmentDeferred("a", storage, 100)).toBe(false)
  deferPasskeyEnrollment("a", 30, storage, 100)
  expect(passkeyEnrollmentDeferred("a", storage, 100 + 29 * 86_400_000)).toBe(
    true,
  )
  expect(passkeyEnrollmentDeferred("a", storage, 100 + 30 * 86_400_000)).toBe(
    false,
  )
  expect(passkeyEnrollmentDeferred("b", storage, 100)).toBe(false)
  for (const value of ["invalid", "Infinity", "-1"]) {
    values.set("passkey-enrollment:a", value)
    expect(passkeyEnrollmentDeferred("a", storage, 100)).toBe(false)
  }
  deferPasskeyEnrollment("a", NaN, storage, 100)
  expect(values.get("passkey-enrollment:a")).toBe(String(100 + 30 * 86_400_000))
})

test("uses browser storage and tolerates storage denial", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
  const values = new Map<string, string>()
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value)
        },
      },
    })
    deferPasskeyEnrollment("a", 1)
    expect(passkeyEnrollmentDeferred("a")).toBe(true)
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Denied")
      },
    })
    expect(passkeyEnrollmentDeferred("a")).toBe(false)
    expect(() => deferPasskeyEnrollment("a", 30)).not.toThrow()
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor)
    else Reflect.deleteProperty(globalThis, "localStorage")
  }
})

test("recognizes cancellation without hiding other failures", () => {
  expect(passkeyCancelled({ name: "NotAllowedError" })).toBe(true)
  expect(passkeyCancelled({})).toBe(false)
  expect(
    passkeyCancelled(new DOMException("Cancelled", "NotAllowedError")),
  ).toBe(true)
  expect(passkeyCancelled(new DOMException("Aborted", "AbortError"))).toBe(true)
  expect(passkeyCancelled(new Error("Server error"))).toBe(false)
  expect(passkeyCancelled(null)).toBe(false)
})
