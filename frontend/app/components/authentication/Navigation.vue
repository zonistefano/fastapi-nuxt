<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui"

const localePath = useLocalePath()
const authStore = useAuthStore()
const { t } = useI18n()
const redirectRoute = "/"

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t("nav.settings"),
      icon: "i-heroicons-cog-8-tooth",
      to: localePath("/settings"),
    },
  ],
  [
    {
      label: t("nav.logout"),
      icon: "i-heroicons-arrow-right-end-on-rectangle",
      onSelect: logout,
    },
  ],
])

async function logout() {
  authStore.logOut()
  await navigateTo(redirectRoute)
}
</script>

<template>
  <UButton
    v-if="!authStore.loggedIn"
    :to="localePath('/login')"
    icon="i-heroicons-arrow-right-20-solid"
    variant="ghost"
    color="neutral"
    class="lg:hidden"
  />

  <UButton
    v-if="!authStore.loggedIn"
    :to="localePath('/login')"
    :label="t('nav.login')"
    trailing-icon="i-heroicons-arrow-right-20-solid"
    variant="outline"
    color="neutral"
    class="hidden lg:inline-flex"
  />

  <UDropdownMenu v-else :items="menuItems">
    <UAvatar :alt="t('nav.account')" />
  </UDropdownMenu>
</template>
