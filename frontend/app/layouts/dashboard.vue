<script setup lang="ts">
// Navigation
const localePath = useLocalePath()
const authStore = useAuthStore()

const links = [
  {
    id: "settings",
    label: "Settings",
    to: "/settings",
    icon: "i-heroicons-cog-8-tooth",
    children: [
      {
        label: "Account",
        to: "/settings",
        exact: true,
      },
      {
        label: "Security",
        to: "/settings/security",
      },
    ],
  },
]
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar id="dashboard" collapsible resizable>
      <template #header> Nuxt UI </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
        />

        <USeparator />

        <UNavigationMenu
          v-if="authStore.is_superuser"
          :collapsed="collapsed"
          :items="[
            {
              label: 'Moderation',
              icon: 'i-heroicons-user-group',
              to: localePath('/moderation'),
            },
          ]"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>
