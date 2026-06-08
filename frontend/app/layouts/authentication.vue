<script setup lang="ts">
const localePath = useLocalePath()
const { t } = useI18n()
</script>

<template>
  <Body>
    <UHeader :to="localePath('/')">
      <template #title>{{ t("app.name") }}</template>
    </UHeader>

    <UMain>
      <div class="flex min-h-[inherit] items-center justify-center py-2">
        <slot />
      </div>
    </UMain>

    <LayoutFooter />
  </Body>
</template>
