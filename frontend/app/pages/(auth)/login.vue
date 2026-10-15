<script setup lang="ts">
import { useAuthenticationMethods } from "~/composables/useAuthenticationMethods"
import * as z from "zod"
import { tokenParser, tokenIsTOTP } from "@/utilities"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const { data: methods } = await useAuthenticationMethods()
const authStore = useAuthStore()
const tokenStore = useTokenStore()
const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const redirectAfterLogin = "/"
const redirectAfterMagic = "/magic"
const redirectTOTP = "/totp"

const oauth = ref(false)
const passkeyOptions = useTemplateRef("passkeyOptions")

const fields = [
  {
    name: "email",
    label: t("common.email"),
    type: "text" as const,
    placeholder: t("auth.login.emailPlaceholder"),
    required: true,
    autocomplete: "username webauthn",
  },
]

const fields_oauth = [
  ...fields,
  {
    name: "password",
    label: t("common.password"),
    type: "password" as const,
    autocomplete: "current-password",
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
  passkeyOptions.value?.cancel()
  await authStore.logIn({
    username: event.data.email,
    password:
      oauth.value && "password" in event.data ? event.data.password : undefined,
  })
  if (authStore.loggedIn) {
    await navigateTo(localePath(redirectAfterLogin))
    return
  }
  if (tokenStore.token && tokenIsTOTP(tokenStore.token)) {
    await navigateTo(localePath(redirectTOTP))
    return
  }
  if (
    tokenStore.token &&
    Object.prototype.hasOwnProperty.call(
      tokenParser(tokenStore.token),
      "fingerprint",
    )
  )
    await navigateTo(localePath(redirectAfterMagic))
}

onMounted(async () => {
  // Check if password requested
  if (route.query && route.query.oauth) oauth.value = true
})
</script>

<template>
  <UAuthForm
    :title="t('auth.login.title')"
    icon="i-lucide-lock"
    :fields="oauth ? fields_oauth : fields"
    :schema="oauth ? schema_oauth : schema"
    @submit="submit"
  >
    <template #description>
      {{ t("auth.login.description") }}
      <NuxtLinkLocale
        v-if="methods?.registration !== false"
        to="/signup"
        class="text-primary font-medium"
        >{{ t("auth.signup.title") }}</NuxtLinkLocale
      >.
    </template>
    <template #password-hint>
      <NuxtLinkLocale
        to="/recover-password"
        class="text-primary font-medium"
        tabindex="-1"
        >{{ t("auth.login.forgotPassword") }}</NuxtLinkLocale
      >
    </template>
    <template #validation>
      <div class="flex items-center justify-between">
        <p class="text-sm">{{ t("auth.login.usePassword") }}</p>
        <USwitch v-model="oauth" color="primary" />
      </div>
    </template>
    <template #footer>
      <AuthenticationOptions ref="passkeyOptions" conditional />
      {{ t("auth.terms") }}
      <NuxtLinkLocale to="/" class="text-primary font-medium">{{
        t("auth.termsLink")
      }}</NuxtLinkLocale
      >.
    </template>
  </UAuthForm>
</template>
