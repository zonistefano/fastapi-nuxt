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
const { t } = useI18n()

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
    <UFormField :label="t('bpmn.id')" name="id" required>
      <UInput v-model="state.id" class="w-full" />
    </UFormField>

    <UFormField :label="t('bpmn.type')" name="type">
      <UInput v-model="state.type" class="w-full" />
    </UFormField>

    <UFormField :label="t('bpmn.label')" name="label">
      <UInput v-model="state.label" class="w-full" />
    </UFormField>
    <div class="flex justify-between">
      <UButton
        variant="outline"
        icon="i-heroicons-trash"
        @click="$emit('delete-element', props.element?.id)"
        >{{ t("bpmn.deleteElement") }}</UButton
      >
      <UButton type="submit">{{ t("bpmn.update") }}</UButton>
    </div>
  </UForm>
</template>
