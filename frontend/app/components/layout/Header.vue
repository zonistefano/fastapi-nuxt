<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()
const pathWithoutLocale = route.path.replace(
  new RegExp(`^/${locale.value}(/|$)`),
  "/",
)

const navigation = computed(() => [
  { label: t("nav.home"), to: localePath("/") },
  {
    label: "Docs",
    to: localePath("/docs/getting-started"),
    children: [
      {
        label: "Getting Started",
        to: localePath("/docs/getting-started"),
      },
      {
        label: "Installation",
        to: localePath("/docs/getting-started/installation"),
      },
    ],
    active: pathWithoutLocale.startsWith("/docs"),
  },
  { label: t("nav.blog"), to: localePath("/blog") },
  { label: "Chat", to: "/chat" },
  { label: "BPMN", to: "/bpmn-editor" },
  { label: t("nav.contact"), to: localePath("/contact") },
])
</script>

<template>
  <UHeader :to="localePath('/')">
    <template #title> Nuxt Starter </template>

    <UNavigationMenu variant="link" :items="navigation" />

    <template #body>
      <UNavigationMenu
        :items="navigation"
        orientation="vertical"
        class="-mx-2.5"
      />
    </template>

    <template #right>
      <AuthenticationNavigation />
    </template>
  </UHeader>
</template>
