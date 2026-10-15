import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, test, vi } from "vitest"
import BpmnCanvas from "~/components/bpmn/BpmnCanvas.vue"
import BpmnElementPalette from "~/components/bpmn/BpmnElementPalette.vue"
import BpmnPropertiesPanel from "~/components/bpmn/BpmnPropertiesPanel.vue"
import BpmnToolbar from "~/components/bpmn/BpmnToolbar.vue"
import BpmnEditor from "~/pages/bpmn-editor.vue"
import { submitForm } from "../helpers"

type Canvas = {
  updateNode: (id: string, properties: object) => void
  deleteElement: (id: string) => void
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
}

const dataTransfer = (type = "") => {
  const data = new Map([["application/bpmn-element-type", type]])
  return {
    getData: (key: string) => data.get(key) ?? "",
    setData: (key: string, value: string) => data.set(key, value),
    effectAllowed: "none",
  }
}

const nodeLabels = (wrapper: {
  findAll: (s: string) => { text: () => string }[]
}) => wrapper.findAll(".vue-flow__node").map((node) => node.text())

async function drop(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  type: string,
) {
  await wrapper.find(".vue-flow").trigger("drop", {
    dataTransfer: dataTransfer(type),
    clientX: 10,
    clientY: 10,
  })
  await flushPromises()
}

describe("BPMN toolbar", () => {
  test.each([
    ["Zoom In", "zoomIn"],
    ["Zoom Out", "zoomOut"],
    ["Fit View", "fitView"],
  ])("%s emits %s", async (label, event) => {
    const wrapper = await mountSuspended(BpmnToolbar)
    await wrapper.find(`[aria-label="${label}"]`).trigger("click")
    expect(wrapper.emitted(event)).toHaveLength(1)
  })
})

describe("BPMN element palette", () => {
  test("puts the element type in the drag data", async () => {
    const wrapper = await mountSuspended(BpmnElementPalette)
    expect(wrapper.text()).toContain("Exclusive Gateway")
    const transfer = dataTransfer()
    const buttons = wrapper.findAll("button")
    await buttons[2]!.trigger("dragstart", { dataTransfer: transfer })
    expect(transfer.getData("application/bpmn-element-type")).toBe("userTask")
    expect(transfer.effectAllowed).toBe("copy")
    expect(wrapper.emitted("elementDragStart")).toEqual([["userTask"]])
  })
})

describe("BPMN properties panel", () => {
  const element = { id: "2", type: "taskNode", label: "Task 1" }

  test("emits the edited properties", async () => {
    const wrapper = await mountSuspended(BpmnPropertiesPanel, {
      props: { element },
    })
    await submitForm(wrapper, { label: "Review" })
    expect(wrapper.emitted("update-properties")).toEqual([
      [{ ...element, label: "Review" }],
    ])
  })

  test("asks to delete the element", async () => {
    const wrapper = await mountSuspended(BpmnPropertiesPanel, {
      props: { element },
    })
    const remove = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Delete"))!
    await remove.trigger("click")
    expect(wrapper.emitted("delete-element")).toEqual([["2"]])
  })
})

describe("BPMN canvas", () => {
  test("renders the initial diagram with node labels", async () => {
    const wrapper = await mountSuspended(BpmnCanvas)
    await flushPromises()
    expect(wrapper.findAll(".vue-flow__node")).toHaveLength(4)
    expect(nodeLabels(wrapper)).toContain("Task 1")
    expect(
      wrapper
        .find(".vue-flow__node-gatewayNode .i-heroicons\\:x-mark-20-solid")
        .exists(),
    ).toBe(true)
    expect(
      wrapper.find(".vue-flow__node-eventNode .border-green-300").exists(),
    ).toBe(true)
    expect(
      wrapper.find(".vue-flow__node-eventNode .border-red-300").exists(),
    ).toBe(true)
  })

  test.each([
    ["startEvent", "Start"],
    ["endEvent", "End"],
    ["userTask", "User Task"],
    ["exclusiveGateway", "Gateway"],
  ])("adds a %s dropped from the palette", async (type, label) => {
    const wrapper = await mountSuspended(BpmnCanvas)
    await drop(wrapper, type)
    expect(wrapper.findAll(".vue-flow__node")).toHaveLength(5)
    if (type === "userTask") expect(nodeLabels(wrapper)).toContain(label)
  })

  test("ignores unknown drops", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const wrapper = await mountSuspended(BpmnCanvas)
    await drop(wrapper, "")
    await drop(wrapper, "lane")
    expect(wrapper.findAll(".vue-flow__node")).toHaveLength(4)
    expect(warn).toHaveBeenCalledWith("Unknown element type dropped:", "lane")
    warn.mockRestore()
  })

  test("keeps node ids unique after deletions", async () => {
    const wrapper = await mountSuspended(BpmnCanvas)
    const canvas = wrapper.vm as unknown as Canvas
    await drop(wrapper, "userTask")
    canvas.deleteElement("2")
    await flushPromises()
    for (let i = 0; i < 3; i++) await drop(wrapper, "userTask")
    const ids = wrapper
      .findAll(".vue-flow__node")
      .map((n) => n.attributes("data-id"))
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(7)
  })

  test("updates a node", async () => {
    const wrapper = await mountSuspended(BpmnCanvas)
    const canvas = wrapper.vm as unknown as Canvas
    canvas.updateNode("2", { label: "Approve" })
    canvas.updateNode("missing", { label: "Ignored" })
    await flushPromises()
    expect(nodeLabels(wrapper)).toContain("Approve")
    canvas.zoomIn()
    canvas.zoomOut()
    canvas.fitView()
  })

  test("selects nodes and clears the selection on the background", async () => {
    const wrapper = await mountSuspended(BpmnCanvas)
    await flushPromises()
    await wrapper.find('.vue-flow__node[data-id="2"]').trigger("click")
    await wrapper.find(".vue-flow__pane").trigger("click")
    const selected = wrapper.emitted("element-select")!
    expect((selected[0]![0] as { id: string }).id).toBe("2")
    expect(selected.at(-1)).toEqual([null])
  })
})

describe("BPMN editor page", () => {
  test("edits and deletes the selected element", async () => {
    const wrapper = await mountSuspended(BpmnEditor, { route: "/bpmn-editor" })
    await flushPromises()
    await wrapper.find('.vue-flow__node[data-id="2"]').trigger("click")
    const panel = await vi.waitFor(() => {
      const found = wrapper.findComponent(BpmnPropertiesPanel)
      expect(found.exists()).toBe(true)
      return found
    })
    panel.vm.$emit("update-properties", {
      id: "2",
      type: "taskNode",
      label: "Approve",
    })
    await flushPromises()
    expect(nodeLabels(wrapper)).toContain("Approve")

    await wrapper.find('.vue-flow__node[data-id="2"]').trigger("click")
    await vi.waitFor(() =>
      expect(wrapper.findComponent(BpmnPropertiesPanel).exists()).toBe(true),
    )
    wrapper.findComponent(BpmnPropertiesPanel).vm.$emit("delete-element", "2")
    await flushPromises()
    expect(wrapper.find('.vue-flow__node[data-id="2"]').exists()).toBe(false)
  })

  test("forwards the toolbar actions to the canvas", async () => {
    const wrapper = await mountSuspended(BpmnEditor, { route: "/bpmn-editor" })
    const toolbar = wrapper.findComponent(BpmnToolbar)
    toolbar.vm.$emit("zoomIn")
    toolbar.vm.$emit("zoomOut")
    toolbar.vm.$emit("fitView")
    await flushPromises()
    expect(wrapper.findComponent(BpmnCanvas).exists()).toBe(true)
  })
})
