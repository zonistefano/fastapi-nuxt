<script setup lang="ts">
import { tokenParser } from "@/utilities"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const tokenStore = useTokenStore()
const { t } = useI18n()
const redirectRoute = "/login"

onMounted(async () => {
  if (
    !Object.prototype.hasOwnProperty.call(
      tokenParser(tokenStore.token),
      "fingerprint",
    )
  ) {
    return await navigateTo(redirectRoute)
  }
})
</script>

<template>
  <UContainer class="py-12">
    <UIcon name="i-heroicons-envelope h-20 w-20 text-(--ui-primary)" />
    <h2 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
      {{ t("auth.magic.title") }}
    </h2>
    <p class="mt-4 text-lg">
      {{ t("auth.magic.sent") }}
    </p>
    <p class="mt-2 text-lg">
      {{ t("auth.magic.sameBrowser") }}
    </p>
    <NuxtLinkLocale to="/login?oauth=true" class="mt-8 flex items-center">
      <UIcon name="i-heroicons-link h-4 w-4 mr-2 text-(--ui-primary)" />
      <p>{{ t("auth.magic.usePassword") }}</p>
    </NuxtLinkLocale>
  </UContainer>
</template>
