<script setup lang="ts">
const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const links = computed(() => [
  {
    id: "diagram-1",
    label: t("bpmn.diagramNumber", { number: 1 }),
    to: localePath("/bpmn-editor"),
  },
])
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar id="dashboard" collapsible resizable>
      <template #header>{{ config.public.appName }}</template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          color="neutral"
          :items="links"
          orientation="vertical"
        />

        <USeparator />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
