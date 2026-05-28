<script setup lang="ts">
import { readableDate } from "@/utilities"

const { locale } = useI18n()
const collection: `blog_${typeof locale.value}` = `blog_${locale.value}`
const { data: blogPosts } = await useAsyncData(useRoute().path, () =>
  queryCollection(collection).all(),
)
if (!blogPosts.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Blog posts not found",
    fatal: true,
  })
}

useSeoMeta({
  title: "Recent blog posts",
  ogTitle: "Recent blog posts",
  description: "Thoughts from the world of me.",
  ogDescription: "Thoughts from the world of me.",
})
</script>

<template>
  <UContainer>
    <UPageHeader
      title="Recent blog posts"
      description="Thoughts from the world of me."
      class="py-[50px]"
    />
    <UPageBody>
      <UBlogPosts>
        <UBlogPost
          v-for="(post, index) in blogPosts"
          :key="index"
          :to="post.path"
          :title="post.title"
          :description="post.description"
          :image="post.image"
          :date="readableDate(post.date)"
          :authors="post.authors"
          :badge="post.badge"
          :orientation="index === 0 ? 'horizontal' : 'vertical'"
          :class="[index === 0 && 'col-span-full']"
        />
      </UBlogPosts>
    </UPageBody>
  </UContainer>
</template>
