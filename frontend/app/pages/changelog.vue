<script setup lang="ts">
const { locale, t } = useI18n()

const collection: `changelog_${typeof locale.value}` = `changelog_${locale.value}`
const { data: versions } = await useAsyncData(useRoute().path, () =>
  queryCollection(collection).order("date", "DESC").all(),
)
if (!versions.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t("common.pageNotFound"),
    fatal: true,
  })
}

useSeoMeta({
  title: t("changelog.title"),
  description: t("changelog.description"),
})
</script>

<template>
  <UContainer>
    <UPageHeader
      :title="t('changelog.title')"
      :description="t('changelog.description')"
      class="py-[50px]"
    />

    <UPageBody>
      <UChangelogVersions>
        <UChangelogVersion
          v-for="(version, index) in versions"
          :key="index"
          v-bind="version"
        >
          <template #body>
            <ContentRenderer :value="version.body" />
          </template>
        </UChangelogVersion>
      </UChangelogVersions>
    </UPageBody>
  </UContainer>
</template>
