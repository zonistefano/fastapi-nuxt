<script setup lang="ts">
const emit = defineEmits(["elementDragStart"])
const { t } = useI18n()

const paletteElements = [
  {
    type: "startEvent",
    label: t("bpmn.startEvent"),
    icon: "i-heroicons-play-circle",
  },
  {
    type: "endEvent",
    label: t("bpmn.endEvent"),
    icon: "i-heroicons-stop-circle",
  },
  { type: "userTask", label: t("bpmn.userTask"), icon: "i-heroicons-user" },
  {
    type: "exclusiveGateway",
    label: t("bpmn.exclusiveGateway"),
    icon: "i-heroicons-squares-plus",
  },
]

function handleDragStart(event: DragEvent, elementType: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData("application/bpmn-element-type", elementType)
    event.dataTransfer.effectAllowed = "copy"
    emit("elementDragStart", elementType)
  }
}
</script>

<template>
  <UCard :ui="{ body: 'p-2 sm:p-2', header: 'p2 sm:p-2' }">
    <template #header>
      <h3 class="text-sm font-semibold text-(--ui-neutral)">
        {{ t("bpmn.elements") }}
      </h3>
    </template>

    <div class="grid grid-cols-2 gap-2">
      <UButton
        v-for="element in paletteElements"
        :key="element.type"
        variant="outline"
        color="neutral"
        :draggable="true"
        class="flex cursor-grab flex-col items-center p-2"
        @dragstart="handleDragStart($event, element.type)"
      >
        <UIcon :name="element.icon" class="mb-1 h-6 w-6" />
        <span class="text-xs">{{ element.label }}</span>
      </UButton>
    </div>
  </UCard>
</template>
