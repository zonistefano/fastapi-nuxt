<script setup lang="ts">
interface BpmnElement {
  id: string
  type: string
  label?: string
}

const props = defineProps<{
  element: BpmnElement | null
}>()

const emit = defineEmits(["update-properties", "delete-element"])

const state = reactive({
  ...props.element,
})

function handleUpdate() {
  const updatedProperties = { ...state }
  emit("update-properties", updatedProperties)
}
</script>

<template>
  <UForm :state="state" class="space-y-4" @submit="handleUpdate">
    <UFormField label="ID" name="id" required>
      <UInput v-model="state.id" class="w-full" />
    </UFormField>

    <UFormField label="Type" name="type">
      <UInput v-model="state.type" class="w-full" />
    </UFormField>

    <UFormField label="Label" name="label">
      <UInput v-model="state.label" class="w-full" />
    </UFormField>
    <div class="flex justify-between">
      <UButton
        variant="outline"
        icon="i-heroicons-trash"
        @click="$emit('delete-element', props.element?.id)"
        >Delete Element</UButton
      >
      <UButton type="submit"> Update </UButton>
    </div>
  </UForm>
</template>
