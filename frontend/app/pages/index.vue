<script setup lang="ts">
import { tokenIsTOTP } from "@/utilities"
import AnimatedBeamExample from "~/components/AnimatedBeamExample.vue"

const { locale, t } = useI18n()

const collection: `index_${typeof locale.value}` = `index_${locale.value}`
const { data: page } = await useAsyncData(useRoute().path, () =>
  queryCollection(collection).first(),
)
if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t("common.pageNotFound"),
    fatal: true,
  })
}

const authStore = useAuthStore()
const tokenStore = useTokenStore()
const route = useRoute()
const redirectTOTP = "/totp"
const redirectAfterLogin = "/"

onMounted(async () => {
  // Check if email is being validated
  if (route.query && route.query.magic) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 100)
    })
    if (!authStore.loggedIn)
      await authStore.magicLogin(route.query.magic as string)
    if (tokenIsTOTP(tokenStore.token)) await navigateTo(redirectTOTP)
    else await navigateTo(redirectAfterLogin)
  }
})

useSeoMeta({
  description: page.value?.description,
  ogTitle: page.value?.title,
  ogDescription: page.value?.description,
})
</script>

<template>
  <div v-if="page">
    <UPageHero
      :title="page.hero.title"
      :description="page.hero.description"
      :links="page.hero.links"
    >
      <template #top>
        <LazyStarsBg />
      </template>

      <template #title>
        <MDC :value="page.hero.title" unwrap="p" />
      </template>

      <SafariMockup
        url="inspira-ui.com"
        src="images/placeholder.webp"
        class="size-full"
      />
    </UPageHero>

    <UPageSection
      v-for="(section, index) in page.sections"
      :key="index"
      :title="section.title"
      :description="section.description"
      :orientation="section.orientation"
      :reverse="section.reverse"
      :features="section.features"
    >
      <ImagePlaceholder />
    </UPageSection>

    <UPageSection
      :title="t('home.integrationsTitle')"
      :description="t('home.integrationsDescription')"
      orientation="horizontal"
    >
      <AnimatedBeamExample />
    </UPageSection>

    <UPageSection
      :title="page.features.title"
      :description="page.features.description"
    >
      <UPageGrid>
        <UPageCard
          v-for="(item, index) in page.features.items"
          :key="index"
          v-bind="item"
          spotlight
        />
      </UPageGrid>
    </UPageSection>

    <UPageSection
      id="testimonials"
      :headline="page.testimonials.headline"
      :title="page.testimonials.title"
      :description="page.testimonials.description"
    >
      <UPageColumns class="xl:columns-4">
        <UPageCard
          v-for="(testimonial, index) in page.testimonials.items"
          :key="index"
          variant="subtle"
          :description="testimonial.quote"
          :ui="{
            description:
              'before:content-[open-quote] after:content-[close-quote]',
          }"
        >
          <template #footer>
            <UUser v-bind="testimonial.user" size="lg" />
          </template>
        </UPageCard>
      </UPageColumns>
    </UPageSection>

    <USeparator />

    <UPageCTA v-bind="page.cta" variant="naked" class="overflow-hidden">
      <LazyStarsBg />
    </UPageCTA>
  </div>
</template>
