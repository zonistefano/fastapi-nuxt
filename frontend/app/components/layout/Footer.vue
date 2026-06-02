<template>
  <UFooter>
    <template #left>
      <div class="text-sm text-(--ui-text-muted)">
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
