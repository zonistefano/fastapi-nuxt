<script setup lang="ts">
import type { IChatMessage } from "~/types"

defineProps<{
  messages: IChatMessage[]
  isLoading?: boolean
  disabled?: boolean
}>()

const input = defineModel<string>("input", { default: "" })

defineEmits<{
  submit: []
  stop: []
  regenerate: [message: IChatMessage]
}>()
</script>

<template>
  <ChatMessageList
    :messages="messages"
    :is-loading="isLoading"
    @regenerate="$emit('regenerate', $event)"
  />

  <ChatInput
    v-model="input"
    :disabled="disabled"
    :streaming="isLoading"
    @submit="$emit('submit')"
    @stop="$emit('stop')"
  />
</template>
