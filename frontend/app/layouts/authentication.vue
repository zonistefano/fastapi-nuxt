<script setup lang="ts">
const router = useRouter()
const localePath = useLocalePath()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push(localePath("/"))
  }
}
</script>

<template>
  <div class="flex h-screen items-center justify-center px-4">
    <UButton
      icon="i-lucide-chevron-left"
      size="xl"
      color="neutral"
      variant="subtle"
      class="absolute top-8 left-8 z-10 rounded-full"
      @click="goBack"
    />

    <UPageCard variant="subtle" class="w-full max-w-sm">
      <slot />
    </UPageCard>
  </div>
</template>
