<script setup lang="ts">
const { locale } = useI18n()
const route = useRoute()
const pathWithoutLocale = route.path.replace(
  new RegExp(`^/${locale.value}(/|$)`),
  "/",
)
const collection: `docs_${typeof locale.value}` = `docs_${locale.value}`
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection(collection).path(pathWithoutLocale).first(),
)
if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Page not found",
    fatal: true,
  })
}

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings(collection, pathWithoutLocale, {
    fields: ["description"],
  })
})

const { data: navigation } = await useAsyncData(
  `${route.path}-navigation`,
  async () => {
    const data = await queryCollectionNavigation(collection)
    return data[0]?.children || []
  },
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
  <UContainer>
    <UPage v-if="page">
      <UPageHeader :title="page.title" :description="page.description" />

      <UPageBody>
        <ContentRenderer :value="page" />

        <USeparator v-if="surround?.length" />

        <UContentSurround :surround="surround" />
      </UPageBody>

      <template #left>
        <UPageAside>
          <template #top>
            <UContentSearchButton
              label="Search..."
              variant="outline"
              class="w-full"
            >
              <template #trailing>
                <div class="ms-auto flex items-center gap-0.5">
                  <UKbd value="meta" />
                  <UKbd value="k" />
                </div>
              </template>
            </UContentSearchButton>
          </template>
          <UContentNavigation :navigation="navigation" highlight />
        </UPageAside>
      </template>

      <template v-if="page?.body?.toc?.links?.length" #right>
        <UContentToc :links="page.body.toc.links" />
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
  </UContainer>
</template>
