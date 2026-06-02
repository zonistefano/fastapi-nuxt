<script setup lang="ts">
import * as locales from "@nuxt/ui/locale"

const { locale } = useI18n()
const colorMode = useColorMode()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)
const themeColor = computed(() =>
  colorMode.value === "dark" ? "#020618" : "white",
)

const config = useRuntimeConfig()
const authStore = useAuthStore()

await authStore.getUserProfile()

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "theme-color", content: themeColor },
  ],
  titleTemplate: (titleChunk) => {
    return titleChunk
      ? `${titleChunk} - ${config.public.appName}`
      : config.public.appName
  },
})
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
