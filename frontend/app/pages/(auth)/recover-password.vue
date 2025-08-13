<script setup lang="ts">
import * as z from "zod"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const authStore = useAuthStore()
const redirectRoute = "/"

const schema = z.object({
  email: z.string().email("Invalid email"),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  await authStore.recoverPassword(event.data.email)
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, 2000)
  })
  await navigateTo(redirectRoute)
}
</script>

<template>
  <UContainer class="py-12">
    <h2 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
      Recover your account
    </h2>
    <UForm
      class="mt-8 max-w-xs space-y-4 sm:max-w-sm lg:max-w-md"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" />
      </UFormField>
      <UButton type="submit"> Submit </UButton>
    </UForm>
  </UContainer>
</template>
