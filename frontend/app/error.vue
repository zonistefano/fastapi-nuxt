<script setup lang="ts">
import type { NuxtError } from "#app"
import * as locales from "@nuxt/ui/locale"

const props = defineProps<{
  error: NuxtError
}>()

const localePath = useLocalePath()
const { locale, t } = useI18n()
const colorMode = useColorMode()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)
const themeColor = computed(() =>
  colorMode.value === "dark" ? "#020618" : "white",
)

const config = useRuntimeConfig()

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
  title: `${t("common.error", { code: props.error.status })} - ${config.public.appName}`,
})
</script>

<template>
  <NuxtLayout>
    <UError :redirect="localePath('/')" :error="error" />
  </NuxtLayout>
</template>
