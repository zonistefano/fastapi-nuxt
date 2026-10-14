// https://nuxt.com/docs/4.x/api/nuxt-config
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],

  nitro: {
    preset: "bun",
    prerender: {
      routes: ["/", "/it"],
      failOnError: true,
    },
  },

  devtools: { enabled: true },

  runtimeConfig: {
    // https://nuxt.com/docs/4.x/api/composables/use-runtime-config#using-the-env-file
    // Private keys are only available on the server
    // apiSecret: 'my-secret-key',
    // Public keys that are exposed to the client
    public: {
      appName: "FastAPI Nuxt",
      apiWS: "ws://localhost:8000",
      apiUrl: "http://localhost:8000",
    },
  },

  modules: [
    "@nuxt/ui",
    "@nuxt/content",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxt/image",
    "@nuxt/eslint",
    "nuxt-llms",
    "nuxt-umami",
    "nuxt-og-image",
  ],

  piniaPluginPersistedstate: {
    cookieOptions: {
      path: "/",
      secure: true,
      sameSite: "lax",
    },
  },

  site: {
    url: "http://localhost:3000",
  },

  i18n: {
    locales: [
      {
        code: "en",
        name: "English",
        language: "en",
        file: "en.ts",
      },
      {
        code: "it",
        name: "Italiano",
        language: "it",
        file: "it.ts",
      },
    ],
    defaultLocale: "en",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
    strategy: "prefix_and_default",
  },

  umami: {
    enabled: Boolean(process.env.NUXT_UMAMI_ID && process.env.NUXT_UMAMI_HOST),
    id: process.env.NUXT_UMAMI_ID || "",
    host: process.env.NUXT_UMAMI_HOST || "",
  },

  content: {
    experimental: { sqliteConnector: "native" },
  },

  llms: {
    domain: "http://localhost:3000/",
    title: "Nuxt Docs Template",
    description:
      "A template for building documentation with Nuxt UI and Nuxt Content.",
  },

  compatibilityDate: "2026-05-01",
})
