import type { ISendEmail, IMsg } from "~/types"
import { apiCore } from "./core"

export const apiService = {
  // USER CONTACT MESSAGE
  async postEmailContact(data: ISendEmail) {
    return await $fetch<IMsg>(`${apiCore.url()}/service/contact`, {
      method: "POST",
      body: data,
    })
  },
}
