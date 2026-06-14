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
  <UContainer>
    <div class="flex items-center gap-3">
      <UIcon
        name="i-heroicons-envelope"
        class="text-primary h-10 w-10 sm:h-14 sm:w-14"
      />
      <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
        {{ t("auth.magic.title") }}
      </h2>
    </div>
    <p class="mt-4 text-lg">
      {{ t("auth.magic.sent") }}
    </p>
    <p class="mt-2 text-lg">
      {{ t("auth.magic.sameBrowser") }}
    </p>
    <NuxtLinkLocale to="/login?oauth=true" class="mt-6 flex items-center">
      <UIcon name="i-heroicons-link" class="text-primary mr-2 h-4 w-4" />
      <p>{{ t("auth.magic.usePassword") }}</p>
    </NuxtLinkLocale>
  </UContainer>
</template>
