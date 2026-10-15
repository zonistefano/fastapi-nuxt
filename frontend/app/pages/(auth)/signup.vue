<script setup lang="ts">
import { useAuthenticationMethods } from "~/composables/useAuthenticationMethods"
import * as z from "zod"
import { loginCreateUserProfile } from "~/api/generated"
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
const toast = useToast()
const { $publicApi } = useNuxtApp()
const { t } = useI18n()
const localePath = useLocalePath()
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
  const password =
    oauth.value && "password" in event.data ? event.data.password : undefined
  // A magic link creates the account; a password needs an explicit signup
  if (password !== undefined) {
    try {
      const response = await loginCreateUserProfile({
        client: $publicApi,
        body: { email: event.data.email, password },
      })
      if ("msg" in response) {
        toast.add({ title: t("auth.signup.title"), description: response.msg })
        await navigateTo(localePath("/login"))
        return
      }
    } catch {
      toast.add({
        title: t("notifications.signupError"),
        description: t("notifications.submissionErrorDescription"),
        icon: "i-heroicons-exclamation-circle",
      })
      return
    }
  }
  await authStore.logIn({ username: event.data.email, password })
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
    v-if="methods?.registration !== false"
    :title="t('auth.signup.title')"
    icon="i-lucide-lock"
    :fields="oauth ? fields_oauth : fields"
    :schema="oauth ? schema_oauth : schema"
    @submit="submit"
  >
    <template #description>
      {{ t("auth.signup.description") }}
      <NuxtLinkLocale to="/login" class="text-primary font-medium">{{
        t("auth.login.title")
      }}</NuxtLinkLocale
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
      <AuthenticationOptions />
      {{ t("auth.terms") }}
      <NuxtLinkLocale to="/" class="text-primary font-medium">{{
        t("auth.termsLink")
      }}</NuxtLinkLocale
      >.
    </template>
  </UAuthForm>
  <UAlert v-else :title="t('auth.signup.closed')">
    <template #description
      ><NuxtLinkLocale to="/login">{{
        t("auth.login.title")
      }}</NuxtLinkLocale></template
    >
  </UAlert>
</template>
