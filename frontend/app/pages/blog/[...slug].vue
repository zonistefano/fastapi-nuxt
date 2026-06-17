<script setup lang="ts">
import { getContentPath, readableDate } from "@/utilities"

const { locale, t } = useI18n()
const route = useRoute()
const contentPath = getContentPath(route.path, locale.value)
const collection: `blog_${typeof locale.value}` = `blog_${locale.value}`
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

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings(collection, contentPath, {
    fields: ["description"],
  })
})

useSeoMeta({
  title: page.value.title,
  ogTitle: page.value.title,
  description: page.value.description,
  ogDescription: page.value.description,
})
</script>

<template>
  <UContainer v-if="page">
    <UPageHeader :title="page.title" :description="page.description">
      <template #headline>
        <UBadge v-bind="page.badge" variant="subtle" />
        <span class="text-(--ui-text-muted)">&middot;</span>
        <time class="text-(--ui-text-muted)">{{
          readableDate(page.date, true, locale)
        }}</time>
      </template>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UButton
          v-for="(author, index) in page.authors"
          :key="index"
          :to="author.to"
          color="neutral"
          variant="subtle"
          target="_blank"
          size="sm"
        >
          <UAvatar
            v-bind="author.avatar"
            :alt="t('blog.authorAvatar')"
            size="2xs"
          />

          {{ author.name }}
        </UButton>
      </div>
    </UPageHeader>

    <UPage>
      <UPageBody>
        <ContentRenderer :value="page" />

        <USeparator v-if="surround?.length" />

        <UContentSurround :surround="surround" />
      </UPageBody>

      <template v-if="page?.body?.toc?.links?.length" #right>
        <UContentToc :links="page.body.toc.links" />
      </template>
    </UPage>
  </UContainer>
</template>
