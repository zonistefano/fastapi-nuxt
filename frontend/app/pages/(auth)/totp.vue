<script setup lang="ts">
import * as z from "zod"
import { tokenIsTOTP } from "@/utilities"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const authStore = useAuthStore()
const tokenStore = useTokenStore()
const { t } = useI18n()
const redirectRoute = "/"

const schema = z.object({
  claim: z
    .array(z.string(t("validation.stringRequired")))
    .length(6, t("validation.stringRequired")),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  claim: [] as string[],
})

async function submit(event: FormSubmitEvent<Schema>) {
  const code = event.data.claim.join("")
  await authStore.totpLogin(code)
  if (authStore.loggedIn) {
    await navigateTo(redirectRoute)
  }
}

onMounted(async () => {
  // Check if token exists
  if (!tokenStore.token || !tokenIsTOTP(tokenStore.token))
    return await navigateTo("/")
})
</script>

<template>
  <UContainer>
    <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
      {{ t("auth.totp.title") }}
    </h2>
    <p class="mt-4 text-lg">
      {{ t("auth.totp.description") }}
    </p>
    <UForm
      class="mt-6 space-y-4"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField
        :label="t('auth.totp.verificationCode')"
        name="claim"
        required
      >
        <UPinInput v-model="state.claim" :length="6" :separator="3" otp />
      </UFormField>
      <UButton type="submit" :label="t('common.submit')" />
    </UForm>
  </UContainer>
</template>
