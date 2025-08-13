<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core"

// Define only the props the component actually uses
defineProps<
  NodeProps<{
    eventType?: "start" | "end"
  }>
>()
</script>

<template>
  <div
    class="bg-(--ui-bg) group h-10 w-10 rounded-full shadow-md"
    :class="[
      data.eventType === 'start'
        ? 'border-2 border-green-300'
        : 'border-2 border-red-300',
    ]"
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
  </div>
</template>
