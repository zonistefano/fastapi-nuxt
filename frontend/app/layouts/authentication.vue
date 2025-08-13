<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <Body>
    <UHeader :to="localePath('/')">
      <template #title> Nuxt Starter </template>
    </UHeader>

    <UMain>
      <div class="flex min-h-[inherit] items-center justify-center py-2">
        <slot />
      </div>
    </UMain>

    <LayoutFooter />
  </Body>
</template>
