<script setup lang="ts">
import * as z from "zod"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const authStore = useAuthStore()
const route = useRoute()
const redirectRoute = "/login"

const schema = z
  .object({
    password: z.string().min(8, "Must be at least 8 characters"),
    confirmation: z.string().min(8, "Must be at least 8 characters"),
  })
  .refine((data) => {
    return data.password === data.confirmation
  }, "Passwords must match")

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  password: undefined,
  confirmation: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  await authStore.resetPassword(
    event.data.password,
    route.query.token as string,
  )
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, 2000)
  })
  await navigateTo(redirectRoute)
}

onMounted(async () => {
  // Check if token exists
  if (!route.query || !route.query.token) await navigateTo("/")
})
</script>

<template>
  <UContainer class="py-12">
    <h2 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
      Reset your password
    </h2>
    <UForm
      class="mt-8 max-w-xs space-y-4 sm:max-w-sm lg:max-w-md"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField label="Password" name="password">
        <UInput v-model="state.password" type="password" />
      </UFormField>
      <UFormField label="Repeat Password" name="confirmation">
        <UInput v-model="state.confirmation" type="password" />
      </UFormField>
      <UButton type="submit">Submit</UButton>
    </UForm>
  </UContainer>
</template>
