<script setup lang="ts">
import { VueFlow, useVueFlow, type Edge, type Node } from "@vue-flow/core"
import { Background } from "@vue-flow/background"
import { MiniMap } from "@vue-flow/minimap"

import "@vue-flow/core/dist/style.css"
import "@vue-flow/core/dist/theme-default.css"
import "@vue-flow/minimap/dist/style.css"

const emit = defineEmits(["element-select"])

const {
  nodes,
  edges,
  addNodes: vueFlowAddNodes,
  addEdges: vueFlowAddEdges,
  screenToFlowCoordinate,
  fitView: vueFlowFitView,
  zoomIn: vueFlowZoomIn,
  zoomOut: vueFlowZoomOut,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onConnect,
  findNode,
  removeNodes,
} = useVueFlow({ snapToGrid: true })

const nodesInitial: Node[] = [
  {
    id: "1",
    type: "eventNode",
    label: "Start",
    position: { x: 220, y: 5 },
    data: { eventType: "start" },
  },
  {
    id: "2",
    type: "taskNode",
    label: "Task 1",
    position: { x: 300, y: 100 },
    data: {},
  },
  {
    id: "g1",
    type: "gatewayNode",
    label: "Decision?",
    position: { x: 400, y: 200 },
    data: { gatewayType: "exclusive" },
  },
  {
    id: "3",
    type: "eventNode",
    label: "End",
    position: { x: 480, y: 300 },
    data: { eventType: "end" },
  },
]
const edgesInitial: Edge[] = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-g1", source: "2", target: "g1" },
  { id: "eg1-3", source: "g1", target: "3" },
]

vueFlowAddNodes(nodesInitial)
vueFlowAddEdges(edgesInitial)

onNodeClick((event) => {
  emit("element-select", event.node)
})

onEdgeClick((event) => {
  emit("element-select", event.edge)
})

onPaneClick(() => {
  // Deselect element when clicking the background
  emit("element-select", null)
})

onConnect(vueFlowAddEdges)

// --- Drag and Drop Handling ---
function onDrop(event: DragEvent) {
  event.preventDefault()
  if (!event.dataTransfer) return

  const type = event.dataTransfer.getData("application/bpmn-element-type")
  if (!type) return

  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  })

  let nodeType = ""
  let nodeLabel = ""
  switch (type) {
    case "startEvent":
      nodeType = "eventNode"
      nodeLabel = "Start"
      addNode(nodeType, position, nodeLabel, { eventType: "start" })
      break
    case "endEvent":
      nodeType = "eventNode"
      nodeLabel = "End"
      addNode(nodeType, position, nodeLabel, { eventType: "end" })
      break
    case "userTask":
      nodeType = "taskNode"
      nodeLabel = "User Task"
      addNode(nodeType, position, nodeLabel)
      break
    case "exclusiveGateway":
      nodeType = "gatewayNode"
      nodeLabel = "Gateway"
      addNode(nodeType, position, nodeLabel, { gatewayType: "exclusive" })
      break
    default:
      console.warn("Unknown element type dropped:", type)
      return
  }
}

// --- Exposed Methods ---
function zoomIn() {
  vueFlowZoomIn()
}

function zoomOut() {
  vueFlowZoomOut()
}

function fitView() {
  vueFlowFitView()
}

const idCounter = computed(() => {
  return nodes.value.length + edges.value.length + 1
})
function addNode(
  nodeType: string,
  position: { x: number; y: number },
  label?: string,
  data: Record<string, unknown> = {},
) {
  const newNodeId = idCounter.value.toString()
  const newNode: Node = {
    id: newNodeId,
    type: nodeType,
    position: position,
    label: label || `${nodeType.replace("Node", "")} ${newNodeId}`,
    data: data,
  }
  vueFlowAddNodes([newNode])
}

function updateNode(nodeId: string, properties: Partial<Node>) {
  const node = findNode(nodeId)
  if (node) {
    Object.assign(node, properties)
  }
}

function deleteElement(elementId: string) {
  removeNodes([elementId], true)
}

defineExpose({
  zoomIn,
  zoomOut,
  fitView,
  updateNode,
  deleteElement,
})
</script>

<template>
  <VueFlow
    :fit-view-on-init="true"
    :min-zoom="0.1"
    :max-zoom="4"
    @dragover.prevent
    @drop="onDrop"
  >
    <MiniMap
      :node-stroke-color="'#555'"
      :node-color="'#fff'"
      :node-border-radius="2"
    />

    <Background pattern-color="#aaa" :gap="15" />

    <!-- Define Custom Node Slots -->
    <!-- bind your custom node type to a component by using slots -->
    <template #node-taskNode="nodeProps">
      <BpmnNodesTaskNode v-bind="nodeProps" />
    </template>
    <template #node-eventNode="nodeProps">
      <BpmnNodesEventNode v-bind="nodeProps" />
    </template>
    <template #node-gatewayNode="nodeProps">
      <BpmnNodesGatewayNode v-bind="nodeProps" />
    </template>
  </VueFlow>
</template>
