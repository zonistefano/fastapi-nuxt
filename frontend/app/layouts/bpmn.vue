<script setup lang="ts">
const links = [
  {
    id: "diagram-1",
    label: "Diagram 1",
    to: "/bpmn-editor",
  },
]
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar id="dashboard" collapsible resizable>
      <template #header="{ collapsed }">
        <ChatTeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          color="neutral"
          :items="links"
          orientation="vertical"
        />

        <USeparator />
      </template>
      <template #footer="{ collapsed }">
        <ChatUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
