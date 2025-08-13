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
const redirectRoute = "/"

const schema = z.object({
  claim: z.string().length(6),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  claim: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  await authStore.totpLogin(event.data.claim)
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
  <UContainer class="py-12">
    <h2 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
      Two-factor authentication
    </h2>
    <p class="mt-4 text-lg">
      Enter the 6-digit verification code from your app.
    </p>
    <UForm
      class="mt-8 max-w-xs space-y-4 sm:max-w-sm lg:max-w-md"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField label="Verification code" name="claim">
        <UInput v-model="state.claim" />
      </UFormField>
      <UButton type="submit" label="Submit" />
    </UForm>
  </UContainer>
</template>
