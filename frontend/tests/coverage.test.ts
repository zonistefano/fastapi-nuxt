import { expect, test } from "bun:test"
import { join } from "node:path"

// Bun only reports files that tests import: loading every logic module makes
// an untested store, composable or utility count against the threshold.
const patterns = [
  "api/*.ts",
  "composables/**/*.ts",
  "middleware/**/*.ts",
  "plugins/**/*.ts",
  "stores/**/*.ts",
  "utilities/**/*.ts",
]

test("every logic module is loaded for coverage", async () => {
  const appDir = join(import.meta.dir, "../app")
  const modules = patterns.flatMap((pattern) =>
    Array.from(new Bun.Glob(pattern).scanSync(appDir)),
  )
  expect(modules).toContain("stores/auth.ts")
  await Promise.all(modules.map((module) => import(join(appDir, module))))
})
