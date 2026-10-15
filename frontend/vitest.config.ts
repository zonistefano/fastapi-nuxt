import { defineVitestConfig } from "@nuxt/test-utils/config"

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    include: ["tests/nuxt/**/*.test.ts"],
    setupFiles: ["tests/nuxt/setup.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      // Logic in .ts files is measured by `bun test` (bunfig.toml)
      include: ["app/**/*.vue"],
      reporter: ["text"],
      thresholds: { lines: 95, statements: 95, functions: 90, branches: 80 },
    },
    environmentOptions: {
      nuxt: {
        domEnvironment: "jsdom",
        overrides: { ogImage: { enabled: false } },
      },
    },
  },
})
