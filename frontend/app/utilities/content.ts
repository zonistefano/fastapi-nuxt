import type { ContentNavigationItem } from "@nuxt/content"

import { pathWithoutLocale } from "./generic"

function getContentPath(path: string, locale: string) {
  const pathNoLocale = pathWithoutLocale(path, locale)

  return `/${locale}${pathNoLocale || "/"}`
}

function getContentLocalizedNavigation(
  items: ContentNavigationItem[],
): ContentNavigationItem[]
function getContentLocalizedNavigation(
  items: Array<ContentNavigationItem | undefined>,
): Array<ContentNavigationItem | undefined> {
  const localePath = useLocalePath()

  return items.map((item) => {
    if (!item) return undefined
    return {
      ...item,
      path: item.path ? localePath(item.path) : item.path,

      children: Array.isArray(item.children)
        ? getContentLocalizedNavigation(item.children).filter(
            (child): child is ContentNavigationItem => child !== undefined,
          )
        : item.children,
    }
  })
}

export { getContentPath, getContentLocalizedNavigation }
