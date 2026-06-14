<script setup lang="ts">
import { pathWithoutLocale } from "@/utilities"

const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const route = useRoute()
const pathNoLocale = computed(() => pathWithoutLocale(route.path))

const navigation = computed(() => [
  { label: t("nav.home"), to: localePath("/") },
  {
    label: t("nav.docs"),
    to: localePath("/docs/getting-started"),
    children: [
      {
        label: t("nav.gettingStarted"),
        to: localePath("/docs/getting-started"),
      },
      {
        label: t("nav.installation"),
        to: localePath("/docs/getting-started/installation"),
      },
    ],
    active: pathNoLocale.value.startsWith("/docs"),
  },
  {
    label: t("nav.blog"),
    to: localePath("/blog"),
    active: pathNoLocale.value.startsWith("/blog"),
  },
  { label: t("nav.chat"), to: "/chat" },
  { label: t("nav.bpmn"), to: "/bpmn-editor" },
  { label: t("nav.contact"), to: localePath("/contact") },
])
</script>

<template>
  <UHeader :to="localePath('/')">
    <template #title>{{ config.public.appName }}</template>

    <UNavigationMenu variant="link" :items="navigation" />

    <template #body>
      <UNavigationMenu
        :items="navigation"
        orientation="vertical"
        class="-mx-2.5"
      />

      <USeparator class="my-6" />

      <UButton
        label="Sign in"
        color="neutral"
        variant="subtle"
        to="/login"
        block
        class="mb-3"
      />
    </template>

    <template #right>
      <AuthenticationNavigation />
    </template>
  </UHeader>
</template>
