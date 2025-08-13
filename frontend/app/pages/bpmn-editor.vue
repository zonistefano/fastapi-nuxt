<script setup lang="ts">
import type BpmnCanvas from "~/components/bpmn/BpmnCanvas.vue"

definePageMeta({
  layout: "bpmn",
})

const bpmnCanvasRef = ref<InstanceType<typeof BpmnCanvas> | null>(null)
const selectedElement = ref<BpmnElement | null>(null)
const isPropertiesPanelOpen = ref(false)

interface BpmnElement {
  id: string
  type: string
  label?: string
}

function handleElementSelect(element: BpmnElement | null) {
  selectedElement.value = element
  isPropertiesPanelOpen.value = !!element
}

function handleZoomIn() {
  bpmnCanvasRef.value?.zoomIn()
}

function handleZoomOut() {
  bpmnCanvasRef.value?.zoomOut()
}

function handleFitView() {
  bpmnCanvasRef.value?.fitView()
}

function handleUpdateProperties(properties: BpmnElement) {
  if (selectedElement.value?.id) {
    bpmnCanvasRef.value?.updateNode(selectedElement.value.id, properties)
    isPropertiesPanelOpen.value = false
  }
}

function handleDeleteElement(elementId: string | undefined) {
  if (elementId) {
    bpmnCanvasRef.value?.deleteElement(elementId)
    selectedElement.value = null
    isPropertiesPanelOpen.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="bpmn-editor">
    <UDashboardNavbar
      :ui="{
        root: 'h-10',
      }"
    >
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <BpmnToolbar
          @zoom-in="handleZoomIn"
          @zoom-out="handleZoomOut"
          @fit-view="handleFitView"
        />
      </template>
    </UDashboardNavbar>

    <!-- Main Content Area for BPMN Editor -->
    <BpmnCanvas ref="bpmnCanvasRef" @element-select="handleElementSelect" />

    <!-- Properties Panel (Right Panel/Slideover) -->
    <USlideover
      v-model:open="isPropertiesPanelOpen"
      title="Properties"
      :ui="{ wrapper: 'w-screen max-w-md' }"
    >
      <template #body>
        <BpmnPropertiesPanel
          v-if="selectedElement"
          ref="propertiesPanelRef"
          :element="selectedElement"
          @update-properties="handleUpdateProperties"
          @delete-element="handleDeleteElement"
        />
      </template>
    </USlideover>
  </UDashboardPanel>
</template>
