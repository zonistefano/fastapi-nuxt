export type ChatRole = "user" | "assistant" | "system"

export interface IChatMessage {
  id: string
  chat_id: string
  role: ChatRole
  content: string
  created: string
}

export interface IChatSummary {
  id: string
  title: string
  created: string
  modified: string
}

export interface IChat extends IChatSummary {
  messages: IChatMessage[]
}

export interface IChatStreamDone {
  message: IChatMessage
}
