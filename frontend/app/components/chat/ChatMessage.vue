<template>
  <div
    class="flex gap-4"
    :class="[role === 'user' ? 'ml-auto' : '', isEditing ? 'w-full' : '']"
  >
    <!-- Assistant Icon -->
    <div v-if="role === 'assistant'" class="shrink-0">
      <UAvatar size="sm" icon="i-heroicons-sparkles" />
    </div>

    <!-- Message Content Area -->
    <div class="flex w-full flex-col gap-2">
      <div
        v-if="!isEditing"
        :class="[
          role === 'user'
            ? 'rounded-xl bg-(--ui-primary) px-3 py-2 text-(--ui-bg)'
            : '',
        ]"
      >
        <p class="whitespace-pre-wrap">
          {{ content }}
        </p>
      </div>

      <ChatMessageEdit
        v-if="isEditing && role === 'user'"
        v-model="editedContent"
        @cancel="cancelEditing"
        @save="saveEdit"
        @send="saveAndRegenerate"
      />

      <div v-if="!isEditing" class="flex items-center gap-1 pt-1 pr-1">
        <UButton
          v-if="role === 'user'"
          icon="i-heroicons-pencil-square"
          size="xs"
          color="neutral"
          variant="ghost"
          title="Edit message"
          @click="startEditing"
        />
        <UButton
          icon="i-heroicons-clipboard-document"
          size="xs"
          color="neutral"
          variant="ghost"
          title="Copy message"
          @click="copyContent"
        />
        <UButton
          v-if="role === 'assistant'"
          icon="i-heroicons-arrow-path"
          size="xs"
          color="neutral"
          variant="ghost"
          title="Regenerate"
          @click="$emit('regenerate')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core"

const props = defineProps({
  messageId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    validator: (value: string) =>
      ["user", "assistant", "system"].includes(value),
  },
  content: {
    type: String,
    default: "",
  },
})

defineEmits<{
  regenerate: []
}>()

// --- Edit State ---
const isEditing = ref(false)
const editedContent = ref("")

watch(
  () => props.content,
  (newContent) => {
    if (!isEditing.value) {
      editedContent.value = newContent
    }
  },
  { immediate: true },
)

function startEditing() {
  editedContent.value = props.content
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  editedContent.value = props.content
}

function saveEdit() {
  console.log("Save Edit:", editedContent.value)
  // Placeholder: Emit event or call store action to update message content
  // Example: emit('update:content', editedContent.value);
  isEditing.value = false
}

function saveAndRegenerate() {
  console.log("Save & Regenerate:", editedContent.value)
  // Placeholder: Emit event or call store action to update message and trigger regeneration
  // Example: emit('update:regenerate', editedContent.value);
  isEditing.value = false
}

// --- Copy State ---
const { copy, copied, isSupported } = useClipboard({
  source: () => props.content,
})

function copyContent() {
  if (isSupported.value) {
    copy()
    console.log("Copied:", copied.value)
  } else {
    console.error("Clipboard API not supported")
  }
}
</script>
