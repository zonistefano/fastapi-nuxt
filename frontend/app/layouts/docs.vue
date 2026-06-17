<script setup lang="ts">
import { getContentLocalizedNavigation } from "@/utilities"

const { t, locale } = useI18n()
const route = useRoute()

const collection: `docs_${typeof locale.value}` = `docs_${locale.value}`

const { data: navigation } = await useAsyncData(
  `${route.path}-navigation`,
  async () => {
    const data = await queryCollectionNavigation(collection)
    return data[0]?.children?.[0]?.children || []
  },
)

const localizedNavigation = computed(() =>
  getContentLocalizedNavigation(navigation.value || []),
)

provide("navigation", navigation)
</script>

<template>
  <Body>
    <LayoutHeader />

    <UMain>
      <UContainer>
        <UPage>
          <UCollapsible
            as="nav"
            class="sticky flex w-full flex-col gap-2 pt-4 pb-2.5 sm:pt-6 sm:pb-4.5 lg:hidden lg:py-8"
          >
            <UButton
              :label="t('docs.navigation')"
              variant="link"
              class="text-default -mt-1.5 px-0 font-semibold"
              trailing-icon="i-lucide-chevron-down"
              block
            />

            <template #content>
              <UContentNavigation highlight :navigation="localizedNavigation" />
            </template>
          </UCollapsible>
          <USeparator class="lg:hidden" />

          <template #left>
            <UPageAside>
              <template #top>
                <UContentSearchButton
                  :label="t('docs.search')"
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
              <UContentNavigation highlight :navigation="localizedNavigation" />
            </UPageAside>
          </template>

          <slot />
        </UPage>
      </UContainer>
    </UMain>

    <LayoutFooter />
  </Body>
</template>
