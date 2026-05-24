import type { IChat, IChatSummary } from "~/types"
import { apiCore } from "./core"

export const apiChat = {
  async list(token: string) {
    return await useFetch<IChatSummary[]>(`${apiCore.url()}/chats`, {
      headers: apiCore.headers(token),
      key: "chats",
    })
  },
  async create(token: string, title?: string) {
    return await $fetch<IChatSummary>(`${apiCore.url()}/chats`, {
      method: "POST",
      body: { title },
      headers: apiCore.headers(token),
    })
  },
  async get(token: string, id: string) {
    return await useFetch<IChat>(`${apiCore.url()}/chats/${id}`, {
      headers: apiCore.headers(token),
      key: `chat-${id}`,
    })
  },
  async rename(token: string, id: string, title: string) {
    return await $fetch<IChatSummary>(`${apiCore.url()}/chats/${id}`, {
      method: "PATCH",
      body: { title },
      headers: apiCore.headers(token),
    })
  },
  async remove(token: string, id: string) {
    return await $fetch<unknown>(`${apiCore.url()}/chats/${id}`, {
      method: "DELETE",
      headers: apiCore.headers(token),
    })
  },
  streamUrl(id: string) {
    return `${apiCore.url()}/chats/${id}/messages/stream`
  },
  regenerateUrl(id: string) {
    return `${apiCore.url()}/chats/${id}/regenerate`
  },
}
