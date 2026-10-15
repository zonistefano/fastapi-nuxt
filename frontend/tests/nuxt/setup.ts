/** Vitest setup for `tests/nuxt/`: content queries read `./content`. */
import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { clearNuxtData } from "#imports"
import { beforeEach, vi } from "vitest"

// jsdom has no ResizeObserver, used by Nuxt UI and the animated components
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const content = await vi.hoisted(() => import("./content"))

mockNuxtImport("queryCollection", () => content.queryCollection)
mockNuxtImport(
  "queryCollectionNavigation",
  () => content.queryCollectionNavigation,
)
mockNuxtImport(
  "queryCollectionItemSurroundings",
  () => content.queryCollectionItemSurroundings,
)
mockNuxtImport(
  "queryCollectionSearchSections",
  () => content.queryCollectionSearchSections,
)

beforeEach(() => {
  content.resetContent()
  // useAsyncData caches by key (often the route path) across mounts
  clearNuxtData()
})
