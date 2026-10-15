<script setup lang="ts">
const { locale, t } = useI18n()

const collection: `pricing_${typeof locale.value}` = `pricing_${locale.value}`
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

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
})

const isYearly = ref("0")

const items = computed(() => [
  { label: t("pricing.monthly"), value: "0" },
  { label: t("pricing.yearly"), value: "1" },
])
</script>

<template>
  <div v-if="page">
    <UPageHero :title="page.title" :description="page.description">
      <template #links>
        <UTabs
          v-model="isYearly"
          :items="items"
          color="neutral"
          size="xs"
          class="w-48"
          :ui="{
            list: 'ring ring-accented rounded-full',
            indicator: 'rounded-full',
            trigger: 'w-1/2',
          }"
        />
      </template>
    </UPageHero>

    <UContainer>
      <UPricingPlans scale>
        <UPricingPlan
          v-for="(plan, index) in page.plans"
          :key="index"
          v-bind="plan"
          :price="isYearly === '1' ? plan.price.year : plan.price.month"
          :billing-cycle="
            isYearly === '1' ? t('pricing.perYear') : t('pricing.perMonth')
          "
        />
      </UPricingPlans>
    </UContainer>

    <UPageSection>
      <UPageLogos>
        <UIcon
          v-for="icon in page.logos.icons"
          :key="icon"
          :name="icon"
          class="text-muted h-12 w-12 shrink-0"
        />
      </UPageLogos>
    </UPageSection>

    <UPageSection :title="page.faq.title" :description="page.faq.description">
      <UAccordion
        :items="page.faq.items"
        :unmount-on-hide="false"
        :default-value="['0']"
        type="multiple"
        class="mx-auto max-w-3xl"
        :ui="{
          trigger: 'text-base text-highlighted',
          body: 'text-base text-muted',
        }"
      />
    </UPageSection>
  </div>
</template>
