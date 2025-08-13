<script setup lang="ts">
import * as uiLocales from "@nuxt/ui/locale"
import { getCommonItemsByKey } from "@/utilities"

const { locale, locales: I18nLocales, setLocale } = useI18n()

const locales = getCommonItemsByKey(
  Object.values(uiLocales),
  I18nLocales.value,
  "code",
)
</script>

<template>
  <ULocaleSelect
    v-model="locale"
    :locales="locales"
    @update:model-value="setLocale(locale)"
  />
</template>
