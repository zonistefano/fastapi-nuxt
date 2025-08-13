// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  // opting in Nuxt 4 features
  future: {
    compatibilityVersion: 4,
  },

  css: ["~/assets/css/main.css"],

  nitro: {
    preset: "bun",
    prerender: {
      routes: ["/", "/it"],
      failOnError: false,
    },
  },

  devtools: { enabled: true },

  runtimeConfig: {
    // https://nuxt.com/docs/api/composables/use-runtime-config#using-the-env-file
    // Private keys are only available on the server
    // apiSecret: 'my-secret-key',
    // Public keys that are exposed to the client
    public: {
      appName: "App_Name",
      apiWS: "ws://localhost:8000/api",
      apiUrl: "http://localhost:8000/api",
    },
  },

  modules: [
    "@nuxt/ui-pro",
    "@nuxt/content",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxt/image",
    "@nuxt/eslint",
    "nuxt-umami",
    "@compodium/nuxt",
  ],

  piniaPluginPersistedstate: {
    cookieOptions: {
      path: "/",
      // maxAge: 60 * 60 * 24 * 30,
      secure: true,
    },
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
    lazy: true,
    strategy: "prefix_and_default",
  },

  umami: {
    id: "c8c7274a-e3c7-45ea-845e-c31631df96c7", //TODO: Change this to your own site ID
    host: "https://umami.zoni.ovh",
  },

  compatibilityDate: "2025-04-05",
})
