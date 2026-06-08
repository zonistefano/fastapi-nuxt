<script setup lang="ts">
import * as z from "zod"
import { tokenParser, tokenIsTOTP } from "@/utilities"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const authStore = useAuthStore()
const tokenStore = useTokenStore()
const route = useRoute()
const { t } = useI18n()
const redirectAfterLogin = "/"
const redirectAfterMagic = "/magic"
const redirectTOTP = "/totp"

const oauth = ref(false)

const fields = [
  {
    name: "email",
    label: t("common.email"),
    type: "text" as const,
    placeholder: t("auth.login.emailPlaceholder"),
    required: true,
  },
]

const fields_oauth = [
  ...fields,
  {
    name: "password",
    label: t("common.password"),
    type: "password" as const,
    placeholder: t("auth.login.passwordPlaceholder"),
  },
]

const schema = z.object({
  email: z.email(t("validation.invalidEmail")),
})

const schema_oauth = z.object({
  ...schema.shape,
  password: z
    .string(t("validation.stringRequired"))
    .min(8, t("validation.minCharacters", { count: 8 })),
})

type Schema = z.output<typeof schema>
type SchemaOauth = z.output<typeof schema_oauth>

async function submit(event: FormSubmitEvent<Schema | SchemaOauth>) {
  await authStore.logIn({
    username: event.data.email,
    password:
      oauth.value && "password" in event.data ? event.data.password : undefined,
  })
  if (authStore.loggedIn) return await navigateTo(redirectAfterLogin)
  if (tokenStore.token && tokenIsTOTP(tokenStore.token))
    return await navigateTo(redirectTOTP)
  if (
    tokenStore.token &&
    Object.prototype.hasOwnProperty.call(
      tokenParser(tokenStore.token),
      "fingerprint",
    )
  )
    return await navigateTo(redirectAfterMagic)
}

onMounted(async () => {
  // Check if password requested
  if (route.query && route.query.oauth) oauth.value = true
})
</script>

<template>
  <UAuthForm
    class="w-full max-w-md"
    :title="t('auth.login.title')"
    :description="t('auth.login.description')"
    icon="i-heroicons-user-circle"
    :fields="oauth ? fields_oauth : fields"
    :schema="oauth ? schema_oauth : schema"
    @submit="submit"
  >
    <template #password-hint>
      <NuxtLinkLocale to="/recover-password">{{
        t("auth.login.forgotPassword")
      }}</NuxtLinkLocale>
    </template>
    <template #validation>
      <div class="flex items-center justify-between">
        <p class="text-sm">{{ t("auth.login.usePassword") }}</p>
        <USwitch v-model="oauth" color="primary" />
      </div>
    </template>
  </UAuthForm>
</template>
