import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import AnimatedBeam from "~/components/AnimatedBeam.vue"

type Box = { left: number; top: number; width: number; height: number }

function element(box: Box) {
  const el = document.createElement("div")
  el.getBoundingClientRect = () =>
    ({ ...box, x: box.left, y: box.top }) as DOMRect
  return el
}

const container = () => element({ left: 0, top: 0, width: 300, height: 200 })
const at = (left: number, top: number) =>
  element({ left, top, width: 20, height: 20 })

let disconnect: ReturnType<typeof vi.fn>

beforeEach(() => {
  disconnect = vi.fn()
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: () => void) {}
      observe() {
        this.callback()
      }
      disconnect = disconnect
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

describe("animated beam", () => {
  test("draws a curved path between the two elements", async () => {
    const wrapper = await mountSuspended(AnimatedBeam, {
      props: {
        containerRef: container(),
        fromRef: at(0, 90),
        toRef: at(280, 90),
        curvature: 40,
        startXOffset: 5,
      },
    })
    expect(wrapper.attributes("width")).toBe("300")
    expect(wrapper.find("path").attributes("d")).toBe(
      "M 15,100 Q 152.5,60 290,100",
    )
    expect(
      wrapper.find('animate[attributeName="x1"]').attributes("values"),
    ).toBe("10%; 110%;")
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  test("animates right to left, also when reversed", async () => {
    const props = {
      containerRef: container(),
      fromRef: at(280, 90),
      toRef: at(0, 90),
    }
    const backwards = await mountSuspended(AnimatedBeam, { props })
    expect(
      backwards.find('animate[attributeName="x1"]').attributes("values"),
    ).toBe("90%; -10%;")
    const reversed = await mountSuspended(AnimatedBeam, {
      props: { ...props, reverse: true },
    })
    expect(
      reversed.find('animate[attributeName="x2"]').attributes("values"),
    ).toBe("0%; 100%;")
  })

  test("animates vertically for vertical beams", async () => {
    const down = await mountSuspended(AnimatedBeam, {
      props: {
        containerRef: container(),
        fromRef: at(100, 0),
        toRef: at(100, 180),
      },
    })
    expect(down.find('animate[attributeName="x1"]').exists()).toBe(false)
    expect(down.find('animate[attributeName="y1"]').attributes("values")).toBe(
      "10%; 110%;",
    )
    const up = await mountSuspended(AnimatedBeam, {
      props: {
        containerRef: container(),
        fromRef: at(100, 180),
        toRef: at(100, 0),
        reverse: true,
      },
    })
    expect(up.find('animate[attributeName="y2"]').attributes("values")).toBe(
      "0%; 100%;",
    )
  })
})
