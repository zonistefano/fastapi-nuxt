import { spawnSync } from "node:child_process"
import {
  cp,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@hey-api/openapi-ts"
import { format, resolveConfig } from "prettier"
import configPromise from "../openapi-ts.config.mjs"

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const backend = resolve(frontend, "../backend")
const check = process.argv.includes("--check")
const config = await configPromise
process.chdir(frontend)

async function files(directory) {
  const result = new Map()
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      for (const [name, contents] of await files(path)) {
        result.set(join(entry.name, name), contents)
      }
    } else {
      result.set(entry.name, await readFile(path, "utf8"))
    }
  }
  return result
}

await mkdir(join(frontend, ".cache"), { recursive: true })
const temporary = await mkdtemp(join(frontend, ".cache/api-"))
try {
  const schema = join(temporary, "openapi.json")
  const exported = spawnSync(
    process.env.UV || "uv",
    ["run", "--locked", "python", "scripts/export_openapi.py", schema],
    { cwd: backend, stdio: "inherit" },
  )
  if (exported.error) throw exported.error
  if (exported.status !== 0) throw new Error("OpenAPI export failed")

  const generated = join(temporary, "generated")
  await createClient({
    ...config,
    input: schema,
    output: { ...config.output, path: generated },
  })

  const expected = await files(generated)
  const formatting = await resolveConfig(join(frontend, "openapi.json"))
  for (const [name, contents] of expected) {
    const formatted = await format(contents, {
      ...formatting,
      filepath: join(generated, name),
    })
    expected.set(name, formatted)
    await writeFile(join(generated, name), formatted)
  }
  await writeFile(
    schema,
    await format(await readFile(schema, "utf8"), {
      ...formatting,
      parser: "json",
    }),
  )
  const actualDirectory = join(frontend, "app/api/generated")
  if (check) {
    const actual = await files(actualDirectory)
    const differences = [...new Set([...expected.keys(), ...actual.keys()])]
      .filter((name) => expected.get(name) !== actual.get(name))
      .map((name) => `app/api/generated/${name}`)
    if (
      (await readFile(schema, "utf8")) !==
      (await readFile(join(frontend, "openapi.json"), "utf8"))
    ) {
      differences.unshift("openapi.json")
    }
    if (differences.length) {
      throw new Error(
        `API artifacts are out of date: ${differences.join(", ")}. Run make api_generate.`,
      )
    }
    console.log("API schema and generated client are up to date.")
  } else {
    // Publish artifacts only after both export and generation have succeeded.
    await copyFile(schema, join(frontend, "openapi.json"))
    await rm(actualDirectory, { recursive: true, force: true })
    await cp(generated, actualDirectory, { recursive: true })
    console.log("API schema, types and SDK generated.")
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
