<script setup lang="ts">
import { useClipboard } from "@vueuse/core"
import { getContentPath } from "@/utilities"

const route = useRoute()

const toast = useToast()
const { locale, t } = useI18n()
const { copy, copied } = useClipboard()
const site = useSiteConfig()

const contentPath = getContentPath(route.path, locale.value)

const mdPath = computed(() => `${site.url}/raw${route.path}.md`)

const items = computed(() => [
  {
    label: t("pageHeaderLinks.copyMarkdownLink"),
    icon: "i-lucide-link",
    onSelect() {
      copy(mdPath.value)
      toast.add({
        title: t("pageHeaderLinks.copiedToClipboard"),
        icon: "i-lucide-check-circle",
      })
    },
  },
  {
    label: t("pageHeaderLinks.viewAsMarkdown"),
    icon: "i-simple-icons:markdown",
    target: "_blank",
    to: `/raw${contentPath}.md`,
    external: true,
  },
  {
    label: t("pageHeaderLinks.openInChatGPT"),
    icon: "i-simple-icons:openai",
    target: "_blank",
    to: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(t("pageHeaderLinks.aiPrompt", { url: mdPath.value }))}`,
  },
  {
    label: t("pageHeaderLinks.openInClaude"),
    icon: "i-simple-icons:anthropic",
    target: "_blank",
    to: `https://claude.ai/new?q=${encodeURIComponent(t("pageHeaderLinks.aiPrompt", { url: mdPath.value }))}`,
  },
])

async function copyPage() {
  copy(await $fetch<string>(`/raw${contentPath}.md`))
}
</script>

<template>
  <UFieldGroup>
    <UButton
      :label="t('pageHeaderLinks.copyPage')"
      :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
      color="neutral"
      variant="outline"
      :ui="{
        leadingIcon: [copied ? 'text-primary' : 'text-neutral', 'size-3.5'],
      }"
      @click="copyPage"
    />
    <UDropdownMenu
      :items="items"
      :content="{
        align: 'end',
        side: 'bottom',
        sideOffset: 8,
      }"
      :ui="{
        content: 'w-48',
      }"
    >
      <UButton
        icon="i-lucide-chevron-down"
        size="sm"
        color="neutral"
        variant="outline"
        :aria-label="t('pageHeaderLinks.openCopyActionsMenu')"
      />
    </UDropdownMenu>
  </UFieldGroup>
</template>
