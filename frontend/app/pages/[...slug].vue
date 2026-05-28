<script setup lang="ts">
const { locale } = useI18n()
const route = useRoute()
const pathWithoutLocale = route.path.replace(
  new RegExp(`^/${locale.value}(/|$)`),
  "/",
)
const collection: `general_${typeof locale.value}` = `general_${locale.value}`
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
