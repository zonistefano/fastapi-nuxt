import { Buffer } from "buffer"

function generateUUID(): string {
  return crypto.randomUUID()
}

function isValidHttpUrl(urlString: string) {
  // https://stackoverflow.com/a/43467144
  let url
  try {
    url = new URL(urlString)
  } catch {
    return false
  }
  return url.protocol === "http:" || url.protocol === "https:"
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function getKeyByValue(object: any, value: any) {
  return Object.keys(object).find((key) => object[key] === value)
}

function getTimeInSeconds(): number {
  // https://stackoverflow.com/a/3830279/295606
  return Math.floor(new Date().getTime() / 1000)
}

function tokenExpired(token: string) {
  const expiry = tokenParser(token).exp
  return (
    typeof expiry !== "number" ||
    !Number.isFinite(expiry) ||
    getTimeInSeconds() >= expiry
  )
}

function tokenParser(token: string) {
  try {
    const payload = token.split(".")[1]
    if (!payload) return {}
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString())
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

function getCommonItemsByKey<T, U, K extends keyof T & keyof U>(
  arr1: T[],
  arr2: U[],
  key: K,
): T[] {
  const set2 = new Set(
    arr2.map((item) => item[key] as unknown as string | number | symbol),
  )

  return arr1.filter((item) =>
    set2.has(item[key] as unknown as string | number | symbol),
  )
}

function pathWithoutLocale(path: string, locale: string): string {
  return path.replace(new RegExp(`^/${locale}(?=/|$)`), "")
}

export {
  generateUUID,
  getTimeInSeconds,
  tokenExpired,
  getKeyByValue,
  isValidHttpUrl,
  tokenParser,
  getCommonItemsByKey,
  pathWithoutLocale,
}
