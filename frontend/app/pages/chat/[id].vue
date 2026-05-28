<script setup lang="ts">
import type { IChatMessage, IChatStreamDone } from "~/types"
import { apiChat, apiCore } from "@/api"

definePageMeta({
  layout: "chat",
  middleware: ["authenticated"],
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const tokenStore = useTokenStore()

const chatId = computed(() => String(route.params.id))
const input = ref("")
const messages = ref<IChatMessage[]>([])
const isLoading = ref(false)
const abortController = shallowRef<AbortController | null>(null)

const { data, error } = await apiChat.get(tokenStore.token, chatId.value)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: "Chat not found",
  })
}

watch(
  data,
  (next) => {
    messages.value = next?.messages ? [...next.messages] : []
  },
  { immediate: true },
)

async function readStream(response: Response, assistantId: string) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response stream available")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split("\n\n")
    buffer = events.pop() ?? ""

    for (const rawEvent of events) {
      const lines = rawEvent.split("\n")
      const event = lines
        .find((line) => line.startsWith("event: "))
        ?.replace("event: ", "")
      const dataLine = lines.find((line) => line.startsWith("data: "))
      const payload = dataLine?.replace("data: ", "") || "{}"

      if (event === "delta") {
        const data = JSON.parse(payload) as { content: string }
        const assistant = messages.value.find(
          (message) => message.id === assistantId,
        )
        if (assistant) assistant.content += data.content
      }
      if (event === "done") {
        const data = JSON.parse(payload) as IChatStreamDone
        const index = messages.value.findIndex(
          (message) => message.id === assistantId,
        )
        if (index >= 0) messages.value[index] = data.message
      }
      if (event === "error") {
        const data = JSON.parse(payload) as { detail: string }
        throw new Error(data.detail)
      }
    }
  }
}

async function streamFrom(url: string, body?: Record<string, string>) {
  if (isLoading.value) return

  if (!tokenStore.token) return navigateTo("/login")

  const controller = new AbortController()
  abortController.value = controller
  isLoading.value = true

  const assistantId = crypto.randomUUID()
  messages.value.push({
    id: assistantId,
    chat_id: chatId.value,
    role: "assistant",
    content: "",
    created: new Date().toISOString(),
  })

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...apiCore.headers(tokenStore.token),
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!response.ok) throw new Error("Unable to stream assistant response")
    await readStream(response, assistantId)
    await refreshNuxtData("chats")
  } catch (error) {
    messages.value = messages.value.filter(
      (message) => message.id !== assistantId,
    )
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      toast.add({
        title: "Chat error",
        description:
          error instanceof Error ? error.message : "Streaming failed.",
        icon: "i-heroicons-exclamation-circle",
        color: "error",
      })
    }
  } finally {
    isLoading.value = false
    abortController.value = null
  }
}

async function submitMessage() {
  const content = input.value.trim()
  if (!content || isLoading.value) return
  input.value = ""
  messages.value.push({
    id: crypto.randomUUID(),
    chat_id: chatId.value,
    role: "user",
    content,
    created: new Date().toISOString(),
  })
  await streamFrom(apiChat.streamUrl(chatId.value), { content })
}

async function regenerate() {
  if (isLoading.value) return
  if (messages.value[messages.value.length - 1]?.role === "assistant") {
    messages.value.pop()
  }
  await streamFrom(apiChat.regenerateUrl(chatId.value))
}

function stop() {
  abortController.value?.abort()
}

onMounted(async () => {
  const prompt =
    typeof route.query.prompt === "string" ? route.query.prompt : ""
  if (prompt) {
    await router.replace({ path: route.path })
    input.value = prompt
    await submitMessage()
  }
})
</script>

<template>
  <UDashboardPanel id="chat" class="min-h-0">
    <UDashboardNavbar
      :title="data?.title || 'Chat'"
      :ui="{
        root: 'h-16 py-2 -mb-6 items-start border-none bg-linear-to-b from-(--ui-bg) to-transparent z-10',
      }"
    >
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>
    <div class="flex min-h-0 flex-1 flex-col">
      <ChatMessageList
        :messages="messages"
        :is-loading="isLoading"
        @regenerate="regenerate"
      />
      <ChatInput
        v-model="input"
        :disabled="isLoading"
        :streaming="isLoading"
        @submit="submitMessage"
        @stop="stop"
      />
    </div>
  </UDashboardPanel>
</template>
