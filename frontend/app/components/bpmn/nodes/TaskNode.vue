<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core"

// Define only the props the component actually uses
const props = defineProps<
  NodeProps<{
    label?: string
    icon?: string
  }>
>()

const nodeLabel = computed(() => {
  if (typeof props.data.label === "string") return props.label
  return "Task"
})
const nodeIcon = computed(() => props.data.icon || "i-heroicons-cog-6-tooth")
</script>

<template>
  <div
    class="rounded-(--ui-radius) group border border-blue-500 bg-blue-100 text-center shadow-md dark:border-blue-400 dark:bg-blue-900"
  >
    <Handle
      type="target"
      :position="Position.Left"
      class="opacity-0 group-hover:!opacity-100"
    />
    <Handle
      type="source"
      :position="Position.Right"
      class="opacity-0 group-hover:!opacity-100"
    />
    <Handle
      type="target"
      :position="Position.Top"
      class="opacity-0 group-hover:!opacity-100"
    />
    <Handle
      type="source"
      :position="Position.Bottom"
      class="opacity-0 group-hover:!opacity-100"
    />

    <div class="flex items-center justify-center gap-1 px-2 py-1">
      <UIcon
        v-if="nodeIcon"
        :name="nodeIcon"
        class="h-4 w-4 text-blue-700 dark:text-blue-300"
      />
      <span class="text-blue-800 dark:text-blue-200">{{ nodeLabel }}</span>
    </div>
  </div>
</template>
