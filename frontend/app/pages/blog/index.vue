<script setup lang="ts">
import { readableDate } from "@/utilities"

const { locale, t } = useI18n()
const localePath = useLocalePath()
const collection: `blog_${typeof locale.value}` = `blog_${locale.value}`
const { data: blogPosts } = await useAsyncData(useRoute().path, () =>
  queryCollection(collection).all(),
)
if (!blogPosts.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t("blog.notFound"),
    fatal: true,
  })
}

useSeoMeta({
  title: () => t("blog.title"),
  ogTitle: () => t("blog.title"),
  description: () => t("blog.description"),
  ogDescription: () => t("blog.description"),
})
</script>

<template>
  <UContainer>
    <UPageHeader
      :title="t('blog.title')"
      :description="t('blog.description')"
      class="py-[50px]"
    />
    <UPageBody>
      <UBlogPosts>
        <UBlogPost
          v-for="(post, index) in blogPosts"
          :key="index"
          :to="localePath(post.path)"
          :title="post.title"
          :description="post.description"
          :image="post.image"
          :date="readableDate(post.date, true, locale)"
          :authors="post.authors"
          :badge="post.badge"
          :orientation="index === 0 ? 'horizontal' : 'vertical'"
          :class="[index === 0 && 'col-span-full']"
        />
      </UBlogPosts>
    </UPageBody>
  </UContainer>
</template>
