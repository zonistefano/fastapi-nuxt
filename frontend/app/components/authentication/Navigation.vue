<script setup lang="ts">
const localePath = useLocalePath()
const authStore = useAuthStore()
const { t } = useI18n()
const redirectRoute = "/"

const menuItems = computed(() => [
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
    :label="t('nav.login')"
    icon="i-heroicons-arrow-right-20-solid"
    variant="ghost"
    trailing
  />
  <UDropdownMenu v-else :items="menuItems">
    <UAvatar
      src="https://avatars.githubusercontent.com/u/739984?v=4"
      :alt="t('nav.account')"
    />
  </UDropdownMenu>
</template>
