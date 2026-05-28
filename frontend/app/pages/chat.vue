<script setup lang="ts">
import { apiChat } from "@/api"

definePageMeta({
  layout: "chat",
  middleware: ["authenticated"],
})

const tokenStore = useTokenStore()
const toast = useToast()
const input = ref("")
const loading = ref(false)

const quickChats = [
  "Draft a launch checklist",
  "Explain this codebase architecture",
  "Write a concise product spec",
  "Help me debug an API error",
]

async function createChat(prompt?: string) {
  const content = (prompt ?? input.value).trim()
  if (!content || loading.value) return

  loading.value = true
  if (!tokenStore.token) {
    loading.value = false
    return navigateTo("/login")
  }

  try {
    const chat = await apiChat.create(tokenStore.token, content)
    await refreshNuxtData("chats")
    input.value = ""
    await navigateTo({
      path: `/chat/${chat.id}`,
      query: { prompt: content },
    })
  } catch {
    toast.add({
      title: "Chat error",
      description: "Unable to create a chat. Please try again.",
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="chat">
    <UDashboardNavbar
      :ui="{
        root: 'h-16 py-2 -mb-6 items-start border-none bg-linear-to-b from-(--ui-bg) to-transparent z-10',
      }"
    >
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="grow overflow-y-auto px-2.5 pt-6">
        <div
          class="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-6"
        >
          <ChatOverview />
          <div class="flex flex-wrap justify-center gap-2">
            <UButton
              v-for="quickChat in quickChats"
              :key="quickChat"
              :label="quickChat"
              icon="i-heroicons-sparkles"
              color="neutral"
              variant="outline"
              size="sm"
              class="rounded-full"
              @click="createChat(quickChat)"
            />
          </div>
        </div>
      </div>
      <ChatInput
        v-model="input"
        :disabled="loading"
        :streaming="loading"
        @submit="createChat()"
      />
    </div>
  </UDashboardPanel>
</template>
