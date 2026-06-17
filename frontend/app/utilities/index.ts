import {
  generateUUID,
  getTimeInSeconds,
  tokenExpired,
  getKeyByValue,
  isValidHttpUrl,
  tokenParser,
  getCommonItemsByKey,
  pathWithoutLocale,
} from "./generic"
import { readableDate } from "./textual"
import { tokenIsTOTP } from "./totp"
import { translate } from "./i18n"
import { getContentPath, getContentLocalizedNavigation } from "./content"

export {
  generateUUID,
  getTimeInSeconds,
  tokenExpired,
  getKeyByValue,
  isValidHttpUrl,
  tokenParser,
  readableDate,
  tokenIsTOTP,
  getCommonItemsByKey,
  pathWithoutLocale,
  translate,
  getContentPath,
  getContentLocalizedNavigation,
}
