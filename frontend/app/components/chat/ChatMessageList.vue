<script setup lang="ts">
// Placeholder for message data and logic
import { ref } from "vue"
const messages = ref([
  { id: "1", role: "assistant", content: "Hello! How can I help you today?" },
  {
    id: "2",
    role: "user",
    content: "I need help converting React components to Vue.",
  },
  {
    id: "3",
    role: "assistant",
    content: "Sure, I can help with that. Please provide the React code.",
  },
  {
    id: "4",
    role: "user",
    content: "Here is the code: <MyComponent />",
  },
  {
    id: "5",
    role: "assistant",
    content: "Great! Let's start with that.",
  },
])
const isLoading = ref(false) // Placeholder
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
          :role="message.role"
          :content="message.content"
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
