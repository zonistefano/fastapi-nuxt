import type { IChatSummary } from "~/types"

export function useChatGroups(chats: Ref<IChatSummary[] | null | undefined>) {
  const groups = computed(() => {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfToday.getDate() - 1)
    const startOfLastWeek = new Date(startOfToday)
    startOfLastWeek.setDate(startOfToday.getDate() - 7)
    const startOfLastMonth = new Date(startOfToday)
    startOfLastMonth.setMonth(startOfToday.getMonth() - 1)

    const buckets: Record<string, IChatSummary[]> = {
      Today: [],
      Yesterday: [],
      "Last week": [],
      "Last month": [],
    }
    const older: Record<string, IChatSummary[]> = {}

    for (const chat of chats.value ?? []) {
      const date = new Date(chat.created)
      if (date >= startOfToday) buckets.Today.push(chat)
      else if (date >= startOfYesterday) buckets.Yesterday.push(chat)
      else if (date >= startOfLastWeek) buckets["Last week"].push(chat)
      else if (date >= startOfLastMonth) buckets["Last month"].push(chat)
      else {
        const key = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
        older[key] ||= []
        older[key].push(chat)
      }
    }

    return [
      ...Object.entries(buckets)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ label, items })),
      ...Object.entries(older).map(([label, items]) => ({ label, items })),
    ]
  })

  return { groups }
}
