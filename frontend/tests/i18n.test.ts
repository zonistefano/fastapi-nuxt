import { describe, expect, test } from "bun:test"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import en from "../i18n/locales/en"
import it from "../i18n/locales/it"

function keys(messages: object, prefix = ""): string[] {
  return Object.entries(messages)
    .flatMap(([key, value]) =>
      typeof value === "object" && value !== null
        ? keys(value, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort()
}

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length))
    .sort()
}

describe("translations", () => {
  test("every locale defines the same keys", () => {
    expect(keys(it)).toEqual(keys(en))
  })

  test("no message is empty", () => {
    for (const messages of [en, it]) {
      const empty = keys(messages).filter((key) => {
        const value = key
          .split(".")
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)[part],
            messages,
          )
        return typeof value !== "string" || !value.trim()
      })
      expect(empty).toEqual([])
    }
  })
})

describe("content", () => {
  test("every locale provides the same pages", () => {
    const content = join(import.meta.dir, "../content")
    expect(files(join(content, "it"))).toEqual(files(join(content, "en")))
  })
})
