<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <UFooter>
    <template #left>
      <div class="text-muted text-sm">
        Copyright © {{ new Date().getFullYear() }}.
        <NuxtLinkLocale to="/privacy">{{
          t("footer.privacyPolicy")
        }}</NuxtLinkLocale>
      </div>
    </template>
    <template #right>
      <LocaleDropdown />
      <UColorModeButton />
    </template>
  </UFooter>
</template>
