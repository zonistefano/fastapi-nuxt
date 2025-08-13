<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["authenticated"],
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <NuxtPage />
    </template>
  </UDashboardPanel>
</template>
