<script setup lang="ts">
const localePath = useLocalePath()
const authStore = useAuthStore()
const redirectRoute = "/"

async function logout() {
  authStore.logOut()
  await navigateTo(redirectRoute)
}
</script>

<template>
  <UButton
    v-if="!authStore.loggedIn"
    :to="localePath('/login')"
    label="Login"
    icon="i-heroicons-arrow-right-20-solid"
    variant="ghost"
    trailing
  />
  <UDropdownMenu
    v-else
    :items="[
      [
        {
          label: 'Settings',
          icon: 'i-heroicons-cog-8-tooth',
          to: localePath('/settings'),
        },
      ],
      [
        {
          label: 'Logout',
          icon: 'i-heroicons-arrow-right-end-on-rectangle',
          click: logout,
        },
      ],
    ]"
  >
    <UAvatar
      src="https://avatars.githubusercontent.com/u/739984?v=4"
      alt="Avatar"
    />
  </UDropdownMenu>
</template>
