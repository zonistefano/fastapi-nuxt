<template>
  <div class="group/message mx-auto w-full max-w-3xl px-4">
    <div class="flex w-full gap-4">
      <!-- Assistant Icon -->
      <div class="shrink-0">
        <UAvatar size="sm" icon="i-heroicons-sparkles" />
        <!-- Original: size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border -->
      </div>

      <!-- Thinking Content -->
      <div class="flex w-full flex-col gap-2">
        <div class="text-muted-foreground flex flex-col gap-4">
          <!-- Using UAlert or similar could be an option -->
          <span class="animate-pulse">Thinking...</span>
          <!-- Original: Thinking... -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles for ChatThinkingMessage if needed */
.text-muted-foreground {
  color: rgb(113 113 122); /* Example: zinc-500 */
}
.dark .text-muted-foreground {
  color: rgb(161 161 170); /* Example: zinc-400 */
}
</style>
