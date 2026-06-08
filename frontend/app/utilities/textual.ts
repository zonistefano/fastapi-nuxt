function readableDate(
  term: Date | string,
  showYear: boolean = true,
  locale?: string,
) {
  const readable = term instanceof Date ? term : new Date(term)
  const dateLocale = locale || useNuxtApp().$i18n.locale.value
  const day = readable.toLocaleDateString(dateLocale, { day: "numeric" })
  const month = readable.toLocaleDateString(dateLocale, { month: "short" })
  if (showYear) {
    const year = readable.toLocaleDateString(dateLocale, { year: "numeric" })
    return `${day} ${month} ${year}`
  }
  return `${day} ${month}`
}

export { readableDate }
