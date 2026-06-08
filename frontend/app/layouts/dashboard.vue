<script setup lang="ts">
// Navigation
const localePath = useLocalePath()
const authStore = useAuthStore()
const { t } = useI18n()

const links = computed(() => [
  {
    id: "settings",
    label: t("nav.settings"),
    to: localePath("/settings"),
    icon: "i-heroicons-cog-8-tooth",
    children: [
      {
        label: t("nav.account"),
        to: localePath("/settings"),
        exact: true,
      },
      {
        label: t("nav.security"),
        to: localePath("/settings/security"),
      },
    ],
  },
])

const moderationLinks = computed(() => [
  {
    label: t("nav.moderation"),
    icon: "i-heroicons-user-group",
    to: localePath("/moderation"),
  },
])
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar id="dashboard" collapsible resizable>
      <template #header>{{ t("app.name") }}</template>

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
          :items="moderationLinks"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>
