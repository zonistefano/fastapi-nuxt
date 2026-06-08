<script setup lang="ts">
defineEmits(["zoomIn", "zoomOut", "fitView"])
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-1.5">
    <UPopover :ui="{ content: 'rounded-[calc(var(--ui-radius)*2)]' }">
      <UButton
        icon="i-heroicons-plus-circle"
        :label="t('bpmn.addElement')"
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
        :aria-label="t('bpmn.zoomIn')"
        color="neutral"
        variant="soft"
        @click="$emit('zoomIn')"
      />
      <UButton
        icon="i-heroicons-magnifying-glass-minus"
        :aria-label="t('bpmn.zoomOut')"
        color="neutral"
        variant="soft"
        @click="$emit('zoomOut')"
      />
      <UButton
        icon="i-heroicons-arrows-pointing-in"
        :aria-label="t('bpmn.fitView')"
        color="neutral"
        variant="soft"
        @click="$emit('fitView')"
      />
    </UButtonGroup>
  </div>
</template>
