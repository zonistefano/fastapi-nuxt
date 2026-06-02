<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core"
import { computed } from "vue"

// Define only the props the component actually uses
const props = defineProps<
  NodeProps<{
    gatewayType?: "exclusive" | "parallel" | "inclusive"
  }>
>()

const nodeIcon = computed(() => {
  switch (props.data.gatewayType) {
    case "exclusive":
      return "i-heroicons-x-mark-20-solid"
    case "parallel":
      return "i-heroicons-plus-20-solid"
    default:
      return null
  }
})
</script>

<template>
  <div class="group relative flex h-10 w-10 items-center justify-center p-7">
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

    <div
      class="absolute h-10 w-10 rotate-45 rounded-(--ui-radius) bg-yellow-100"
    />

    <UIcon v-if="nodeIcon" :name="nodeIcon" class="h-7 w-7" />
  </div>
</template>
