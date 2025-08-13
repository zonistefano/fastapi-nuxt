<script setup lang="ts">
import { tokenParser } from "@/utilities"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const tokenStore = useTokenStore()
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
      Check your email
    </h2>
    <p class="mt-4 text-lg">
      We sent you an email with a magic link. Once you click that (or copy it
      into this browser) you'll be signed in.
    </p>
    <p class="mt-2 text-lg">
      Make sure you use the same browser you requested the login from or it
      won't work.
    </p>
    <NuxtLinkLocale to="/login?oauth=true" class="mt-8 flex items-center">
      <UIcon name="i-heroicons-link h-4 w-4 mr-2 text-(--ui-primary)" />
      <p>If you prefer, use your password.</p>
    </NuxtLinkLocale>
  </UContainer>
</template>
