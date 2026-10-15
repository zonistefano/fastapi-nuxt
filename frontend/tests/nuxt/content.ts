/**
 * In-memory Nuxt Content: tests have no content server, so the query
 * composables read these collections instead. `index_*` and `pricing_*` load
 * the real YAML files, the Markdown collections use small fixtures.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "yaml"

type Item = Record<string, unknown> & { path?: string }

// Shared through globalThis: the setup file and the tests may load this
// module in different module graphs
const store = globalThis as { __testContent?: Map<string, Item[]> }
export const collections = (store.__testContent ??= new Map<string, Item[]>())

export const body = (text: string, toc: object[] = []) => ({
  type: "minimark",
  value: [["p", {}, text]],
  toc: { title: "", depth: 2, searchDepth: 2, links: toc },
})

const yaml = (file: string) =>
  parse(readFileSync(join(process.cwd(), "content", file), "utf8")) as Item

const post = (locale: string, slug: string, title: string, date: string) => ({
  path: `/${locale}/blog/${slug}`,
  title,
  description: `${title} description`,
  image: { src: "/images/post.webp" },
  authors: [
    { name: "Ada", to: "https://example.com", avatar: { src: "/a.png" } },
  ],
  date,
  badge: { label: "News" },
  body: body(`${title} body`),
})

const doc = (locale: string, slug: string, title: string) => ({
  path: `/${locale}/docs/${slug}`,
  title,
  description: `${title} description`,
  body: body(`${title} body`, [{ id: "intro", depth: 2, text: "Intro" }]),
})

export function resetContent() {
  collections.clear()
  for (const locale of ["en", "it"]) {
    collections.set(`index_${locale}`, [yaml(`${locale}/index.yml`)])
    collections.set(`pricing_${locale}`, [yaml(`${locale}/pricing.yml`)])
    collections.set(`general_${locale}`, [
      {
        path: `/${locale}/privacy`,
        title: "Privacy",
        description: "Privacy policy",
        body: body("Privacy body"),
      },
    ])
    collections.set(`blog_${locale}`, [
      post(locale, "first", "First post", "2026-01-10"),
      post(locale, "second", "Second post", "2026-02-20"),
    ])
    collections.set(`docs_${locale}`, [
      doc(locale, "getting-started", "Introduction"),
      doc(locale, "getting-started/installation", "Installation"),
    ])
    collections.set(`changelog_${locale}`, [
      {
        path: `/${locale}/changelog/launch`,
        title: "Launch",
        description: "First release",
        date: "2026-01-01",
        body: body("Launch notes"),
      },
      {
        path: `/${locale}/changelog/teams`,
        title: "Teams",
        description: "Team support",
        date: "2026-03-01",
        body: body("Teams notes"),
      },
    ])
  }
}

export function queryCollection(name: string) {
  let items = [...(collections.get(name) ?? [])]
  const query = {
    path(path: string) {
      items = items.filter((item) => item.path === path)
      return query
    },
    order(field: string, direction: "ASC" | "DESC") {
      const sign = direction === "ASC" ? 1 : -1
      items.sort(
        (a, b) => sign * String(a[field]).localeCompare(String(b[field])),
      )
      return query
    },
    first: async () => items[0] ?? null,
    all: async () => items,
  }
  return query
}

export async function queryCollectionNavigation(name: string) {
  const children = (collections.get(name) ?? []).map(({ title, path }) => ({
    title,
    path,
  }))
  return [
    {
      title: "Docs",
      path: "/docs",
      children: [{ title: "Guide", path: "/docs/guide", children }],
    },
  ]
}

export async function queryCollectionItemSurroundings(
  name: string,
  path: string,
) {
  const items = collections.get(name) ?? []
  const index = items.findIndex((item) => item.path === path)
  const pick = (item?: Item) =>
    item
      ? { title: item.title, path: item.path, description: item.description }
      : null
  return [pick(items[index - 1]), pick(items[index + 1])]
}

export async function queryCollectionSearchSections() {
  return []
}
