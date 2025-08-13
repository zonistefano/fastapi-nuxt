<script setup lang="ts">
const links = [
  {
    id: "chat-1",
    label: "Chat 1",
    to: "/chat",
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
