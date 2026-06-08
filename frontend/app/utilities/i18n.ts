function translate(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

export { translate }
