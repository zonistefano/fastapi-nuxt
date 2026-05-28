<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui"
import type { IChatSummary } from "~/types"
import { apiChat } from "@/api"

const tokenStore = useTokenStore()
const authStore = useAuthStore()
const toast = useToast()
const route = useRoute()

const { data: chats, refresh } = await apiChat.list(tokenStore.token)
const { groups } = useChatGroups(chats)

const links = computed(() => [
  {
    id: "new-chat",
    label: "New chat",
    icon: "i-lucide-circle-plus",
    to: "/chat",
  },
])

const chatItems = computed(() =>
  groups.value.flatMap((group) => [
    {
      label: group.label,
      type: "label" as const,
    },
    ...group.items.map((chat) => ({
      ...chat,
      id: chat.id,
      label: chat.title || "Untitled",
      to: `/chat/${chat.id}`,
      slot: "chat" as const,
      active: route.path === `/chat/${chat.id}`,
    })),
  ]),
)

function chatActions(chat: IChatSummary): DropdownMenuItem[][] {
  return [
    [
      {
        label: "Rename",
        icon: "i-lucide-pencil",
        onSelect: async () => {
          const next = window.prompt("Rename chat", chat.title)
          if (!next?.trim()) return
          await apiChat.rename(tokenStore.token, chat.id, next.trim())
          await refresh()
        },
      },
    ],
    [
      {
        label: "Delete",
        icon: "i-lucide-trash",
        color: "error" as const,
        onSelect: async () => {
          try {
            await apiChat.remove(tokenStore.token, chat.id)
            await refresh()
            if (route.path === `/chat/${chat.id}`) await navigateTo("/chat")
          } catch {
            toast.add({
              title: "Delete failed",
              description: "Unable to delete this chat.",
              icon: "i-heroicons-exclamation-circle",
              color: "error",
            })
          }
        },
      },
    ],
  ]
}

watch(
  () => authStore.loggedIn,
  async (loggedIn) => {
    if (loggedIn) await refresh()
  },
)
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar id="dashboard" collapsible resizable>
      <template #header="{ collapsed }">
        <ChatTeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          color="neutral"
          :items="links"
          orientation="vertical"
        />

        <USeparator />

        <UNavigationMenu
          v-if="!collapsed"
          :items="chatItems"
          color="neutral"
          orientation="vertical"
          :ui="{
            link: 'overflow-hidden pr-8',
            linkTrailing:
              'absolute inset-e-1 opacity-0 group-hover:opacity-100 group-has-data-[state=open]:opacity-100',
          }"
        >
          <template #chat-trailing="{ item }">
            <UDropdownMenu
              :items="chatActions(item as unknown as IChatSummary)"
              :content="{ align: 'end' }"
            >
              <UButton
                as="div"
                icon="i-lucide-ellipsis"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Chat actions"
                @click.stop.prevent
              />
            </UDropdownMenu>
          </template>
        </UNavigationMenu>
      </template>
      <template #footer="{ collapsed }">
        <ChatUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>
