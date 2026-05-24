<script setup lang="ts">
const model = defineModel<string>({ default: "" })

defineProps<{
  disabled?: boolean
  streaming?: boolean
}>()

const emit = defineEmits<{
  submit: []
  stop: []
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-2.5 pb-4">
    <form
      class="bg-(--ui-bg-elevated) flex flex-col gap-2 rounded-3xl p-1.5"
      @submit.prevent="emit('submit')"
    >
      <UTextarea
        v-model="model"
        placeholder="Send a message..."
        :rows="2"
        :maxrows="8"
        variant="none"
        autoresize
        :disabled="disabled"
        :ui="{ base: 'resize-none' }"
        @keydown.enter.exact.prevent="emit('submit')"
      />

      <div class="flex items-center gap-2 px-2.5">
        <UButton
          v-if="streaming"
          icon="i-heroicons-stop"
          type="button"
          variant="solid"
          color="neutral"
          class="rounded-full"
          @click="emit('stop')"
        />
        <UButton
          v-else
          icon="i-heroicons-arrow-up"
          type="submit"
          variant="solid"
          color="neutral"
          class="ml-auto rounded-full"
          :disabled="disabled || !model.trim()"
        />
      </div>
    </form>
  </div>
</template>
