<template>
  <div class="mx-auto w-full max-w-6xl px-2.5 pb-4">
    <div class="bg-(--ui-bg-elevated) flex flex-col gap-2 rounded-3xl p-1.5">
      <!-- Placeholder for Suggested Actions -->
      <!-- <ChatSuggestedActions v-if="showSuggestions" /> -->

      <!-- Placeholder for Attachments Preview -->
      <!-- <div v-if="attachments.length > 0 || uploadQueue.length > 0" class="flex flex-row gap-2 overflow-x-scroll items-end"> ... </div> -->

      <!-- Main Input Area -->
      <UTextarea
        placeholder="Send a message..."
        :rows="2"
        :maxrows="8"
        variant="none"
        autoresize
        :ui="{ base: 'resize-none' }"
        @keydown.enter.exact.prevent="
          () => {
            /* Handle submit later */
          }
        "
      />

      <div class="flex items-center gap-2 px-2.5">
        <!-- Attachment Button -->
        <UButton
          icon="i-heroicons-paper-clip"
          variant="soft"
          color="neutral"
          class="rounded-full"
        />
        <UButton
          icon="i-heroicons-arrow-up"
          variant="solid"
          color="neutral"
          class="ml-auto rounded-full"
        />
      </div>
    </div>
  </div>
</template>
