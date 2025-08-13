<script setup lang="ts">
definePageMeta({
  layout: "chat",
})
</script>

<template>
  <UDashboardPanel id="chat">
    <UDashboardNavbar
      :ui="{
        root: 'h-16 py-2 -mb-6 items-start border-none bg-linear-to-b from-(--ui-bg) to-transparent z-10',
      }"
    >
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>
    <ChatContainer />
  </UDashboardPanel>
</template>
