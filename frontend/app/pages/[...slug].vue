<script setup lang="ts">
import { getContentPath } from "@/utilities"

const { locale, t } = useI18n()
const route = useRoute()
const contentPath = getContentPath(route.path, locale.value)
const collection: `general_${typeof locale.value}` = `general_${locale.value}`
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

useSeoMeta({
  title: page.value.title,
  ogTitle: page.value.title,
  description: page.value.description,
  ogDescription: page.value.description,
})
</script>

<template>
  <UContainer v-if="page">
    <ContentRenderer :value="page" />
  </UContainer>
</template>
