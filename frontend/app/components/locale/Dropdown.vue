<script setup lang="ts">
import * as uiLocales from "@nuxt/ui/locale"
import { getCommonItemsByKey } from "@/utilities"

const {
  locale,
  locales: I18nLocales,
  setLocale,
  loadLocaleMessages,
} = useI18n()

const locales = getCommonItemsByKey(
  Object.values(uiLocales),
  I18nLocales.value,
  "code",
)

const switchLocale = async () => {
  await loadLocaleMessages(locale.value)
  setLocale(locale.value)
}
</script>

<template>
  <ULocaleSelect
    v-model="locale"
    :locales="locales"
    @update:model-value="switchLocale"
  />
</template>
