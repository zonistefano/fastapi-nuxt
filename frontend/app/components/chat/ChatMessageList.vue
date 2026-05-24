<script setup lang="ts">
import type { IChatMessage } from "~/types"

defineProps<{
  messages: IChatMessage[]
  isLoading?: boolean
}>()

defineEmits<{
  regenerate: [message: IChatMessage]
}>()
</script>

<template>
  <div class="grow overflow-y-auto px-2.5 pt-6">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <ChatOverview v-if="messages.length === 0" />

      <!-- Actual Message Loop -->
      <template v-else>
        <ChatMessage
          v-for="message in messages"
          :key="message.id"
          :message-id="message.id"
          :role="message.role"
          :content="message.content"
          @regenerate="$emit('regenerate', message)"
        />
        <ChatThinkingMessage
          v-if="isLoading && messages[messages.length - 1]?.role === 'user'"
        />
      </template>

      <!-- Scroll anchor -->
      <div class="min-h-[24px] min-w-[24px] shrink-0" />
    </div>
  </div>
</template>
