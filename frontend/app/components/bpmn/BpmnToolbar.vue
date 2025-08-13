<script setup lang="ts">
defineEmits(["zoomIn", "zoomOut", "fitView"])
</script>

<template>
  <div class="flex items-center gap-1.5">
    <UPopover :ui="{ content: 'rounded-[calc(var(--ui-radius)*2)]' }">
      <UButton
        icon="i-heroicons-plus-circle"
        label="Add Element"
        color="neutral"
        variant="soft"
        trailing-icon="i-heroicons-chevron-down-20-solid"
      />
      <template #content>
        <BpmnElementPalette
          @element-drag-start="console.log('Drag Start', $event)"
        />
      </template>
    </UPopover>

    <UButtonGroup>
      <UButton
        icon="i-heroicons-magnifying-glass-plus"
        aria-label="Zoom In"
        color="neutral"
        variant="soft"
        @click="$emit('zoomIn')"
      />
      <UButton
        icon="i-heroicons-magnifying-glass-minus"
        aria-label="Zoom Out"
        color="neutral"
        variant="soft"
        @click="$emit('zoomOut')"
      />
      <UButton
        icon="i-heroicons-arrows-pointing-in"
        aria-label="Fit View"
        color="neutral"
        variant="soft"
        @click="$emit('fitView')"
      />
    </UButtonGroup>
  </div>
</template>
