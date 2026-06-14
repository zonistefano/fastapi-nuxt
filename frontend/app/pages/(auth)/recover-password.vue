<script setup lang="ts">
import * as z from "zod"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const authStore = useAuthStore()
const { t } = useI18n()
const redirectRoute = "/"

const schema = z.object({
  email: z.email(t("validation.invalidEmail")),
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
  <UContainer>
    <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
      {{ t("auth.recover.title") }}
    </h2>
    <UForm
      class="mt-6 space-y-4"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField :label="t('common.email')" name="email" required>
        <UInput v-model="state.email" class="w-full" />
      </UFormField>
      <UButton type="submit">{{ t("common.submit") }}</UButton>
    </UForm>
  </UContainer>
</template>
