<script setup lang="ts">
import type { ContentNavigationItem } from "@nuxt/content"

import { findPageHeadline } from "@nuxt/content/utils"
import { getContentPath, getContentLocalizedNavigation } from "@/utilities"

const { locale, t } = useI18n()
const route = useRoute()
const contentPath = getContentPath(route.path, locale.value)
const collection: `docs_${typeof locale.value}` = `docs_${locale.value}`
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection(collection).path(contentPath).first(),
)
if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t("common.pageNotFound"),
    fatal: true,
  })
}

definePageMeta({
  layout: "docs",
})

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings(collection, contentPath, {
    fields: ["description"],
  })
})

const localizedSurround = computed(() =>
  getContentLocalizedNavigation(surround.value || []),
)

const navigation = inject<Ref<ContentNavigationItem[]>>("navigation")

const headline = computed(() =>
  findPageHeadline(navigation?.value, page.value?.path),
)

const searchTerm = ref("")

const { data: files } = useLazyAsyncData(
  `${route.path}-search`,
  () => queryCollectionSearchSections(collection),
  {
    server: false,
  },
)

useSeoMeta({
  title: page.value.title,
  ogTitle: page.value.title,
  description: page.value.description,
  ogDescription: page.value.description,
})
</script>

<template>
  <div>
    <UPage v-if="page">
      <UPageHeader
        :title="page.title"
        :description="page.description"
        :headline="headline"
      >
        <template #links>
          <PageHeaderLinks />
        </template>
      </UPageHeader>

      <UPageBody>
        <ContentRenderer :value="page" />

        <USeparator v-if="surround?.length" />

        <UContentSurround :surround="localizedSurround" />
      </UPageBody>

      <template v-if="page?.body?.toc?.links?.length" #right>
        <UContentToc class="hidden lg:block" :links="page.body.toc.links" />
      </template>
    </UPage>

    <ClientOnly>
      <LazyUContentSearch
        v-model:search-term="searchTerm"
        :files="files"
        shortcut="meta_k"
        :navigation="navigation"
        :color-mode="false"
        :fuse="{ resultLimit: 42 }"
      />
    </ClientOnly>
  </div>
</template>
