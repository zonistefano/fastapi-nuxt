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
      <!-- Placeholder for Attachments -->
      <!-- <div v-if="attachments" class="flex flex-row justify-end gap-2"> ... </div> -->

      <!-- Placeholder for Reasoning -->
      <!-- <ChatMessageReasoning v-if="reasoning" :reasoning="reasoning" /> -->

      <!-- Message Text (View Mode) -->
      <div
        v-if="!isEditing"
        :class="[
          role === 'user'
            ? 'bg-(--ui-primary) text-(--ui-bg) rounded-xl px-3 py-2'
            : '',
        ]"
      >
        <!-- Using UMarkdown or similar would go here -->
        <p>
          {{ content }}
        </p>
        <!-- Placeholder for Markdown rendering -->
      </div>

      <!-- Message Editor (Edit Mode - User only) -->
      <ChatMessageEdit
        v-if="isEditing && role === 'user'"
        v-model="editedContent"
        @cancel="cancelEditing"
        @save="saveEdit"
        @send="saveAndRegenerate"
      />

      <!-- Message Actions -->
      <div
        v-if="role === 'user' && !isEditing"
        class="flex items-center gap-1 pr-1 pt-1"
      >
        <UButton
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
      </div>

      <!-- Placeholder for Tool Invocations -->
      <!-- <div v-if="toolInvocations" class="flex flex-col gap-4"> ... </div> -->

      <!-- Placeholder for Message Actions -->
      <!-- <ChatMessageActions v-if="!isReadonly" /> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core"

const props = defineProps({
  role: {
    type: String,
    required: true,
    validator: (value: string) => ["user", "assistant"].includes(value),
  },
  content: {
    type: String,
    default: "",
  },
  // Add other props like attachments, reasoning, toolInvocations, vote, isLoading etc. later
})

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
  editedContent.value = props.content // Reset to original content on edit start
  isEditing.value = true
  // Consider focusing the textarea nextTick
}

function cancelEditing() {
  isEditing.value = false
  editedContent.value = props.content // Revert changes
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
    // Optionally show feedback, e.g., using UToast
    console.log("Copied:", copied.value)
  } else {
    console.error("Clipboard API not supported")
    // Optionally show error feedback
  }
}
</script>
