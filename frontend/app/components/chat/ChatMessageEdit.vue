<script setup lang="ts">
const model = defineModel<string>()

defineEmits(["save", "cancel", "send"])
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <div class="flex flex-col gap-2 rounded-3xl bg-(--ui-bg-elevated) p-1.5">
      <!-- Placeholder for Suggested Actions -->
      <!-- <ChatSuggestedActions v-if="showSuggestions" /> -->

      <!-- Placeholder for Attachments Preview -->
      <!-- <div v-if="attachments.length > 0 || uploadQueue.length > 0" class="flex flex-row gap-2 overflow-x-scroll items-end"> ... </div> -->

      <!-- Main Input Area -->
      <UTextarea
        v-model="model"
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
        <UButton
          label="Save"
          variant="soft"
          color="neutral"
          class="rounded-full"
          @click="$emit('save')"
        />
        <UButton
          label="Cancel"
          variant="soft"
          color="neutral"
          class="ml-auto rounded-full"
          @click="$emit('cancel')"
        />
        <UButton
          label="Send"
          variant="solid"
          color="neutral"
          class="rounded-full"
          @click="$emit('send')"
        />
      </div>
    </div>
  </div>
</template>
