/**
 * Preloaded by bunfig.toml: replaces the Nuxt auto-imports used by stores,
 * middleware and plugins with the test doubles in `./nuxt`.
 */
import { installNuxtGlobals } from "./nuxt"

installNuxtGlobals()

const { useAuthStore } = await import("~/stores/auth")
const { useTokenStore } = await import("~/stores/tokens")
Object.assign(globalThis, { useAuthStore, useTokenStore })
