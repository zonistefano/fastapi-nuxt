import { tokenParser } from "./generic"

function tokenIsTOTP(token: string) {
  const obj = tokenParser(token)
  if (obj && Object.prototype.hasOwnProperty.call(obj, "totp")) return obj.totp
  else return false
}

export { tokenIsTOTP }
