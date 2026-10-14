import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  logs: { level: "warn" },
  input: "openapi.json",
  output: {
    path: "app/api/generated",
  },
  plugins: [
    "@hey-api/typescript",
    { name: "@hey-api/client-fetch", throwOnError: true },
    { name: "@hey-api/sdk", responseStyle: "data" },
  ],
})
