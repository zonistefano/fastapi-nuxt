<template>
  <UFooter>
    <template #left>
      <div class="text-(--ui-text-muted) text-sm">
        Copyright © {{ new Date().getFullYear() }}.
        <NuxtLinkLocale to="/privacy">Privacy Policy.</NuxtLinkLocale>
      </div>
    </template>
    <template #right>
      <LocaleDropdown />
      <UColorModeButton />
    </template>
  </UFooter>
</template>
