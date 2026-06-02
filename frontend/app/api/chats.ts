import type { IChat, IChatSummary } from "~/types"
import { apiCore } from "./core"

export const apiChat = {
  async list() {
    return await apiCore.useRequest<IChatSummary[]>("/chats", {
      key: "chats",
    })
  },
  async create(title?: string) {
    return await apiCore.request<IChatSummary>("/chats", {
      method: "POST",
      body: { title },
    })
  },
  async get(id: string) {
    return await apiCore.useRequest<IChat>(`/chats/${id}`, {
      key: `chat-${id}`,
    })
  },
  async rename(id: string, title: string) {
    return await apiCore.request<IChatSummary>(`/chats/${id}`, {
      method: "PATCH",
      body: { title },
    })
  },
  async remove(id: string) {
    return await apiCore.request<unknown>(`/chats/${id}`, {
      method: "DELETE",
    })
  },
  async stream(id: string, body: Record<string, string>, signal?: AbortSignal) {
    return await apiCore.stream(`/chats/${id}/messages/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
  },
  async regenerate(id: string, signal?: AbortSignal) {
    return await apiCore.stream(`/chats/${id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
    })
  },
}
