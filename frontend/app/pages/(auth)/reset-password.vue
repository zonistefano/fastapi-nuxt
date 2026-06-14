<script setup lang="ts">
import * as z from "zod"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const authStore = useAuthStore()
const route = useRoute()
const { t } = useI18n()
const redirectRoute = "/login"

const schema = z
  .object({
    password: z
      .string(t("validation.stringRequired"))
      .min(8, t("validation.minCharacters", { count: 8 })),
    confirmation: z
      .string(t("validation.stringRequired"))
      .min(8, t("validation.minCharacters", { count: 8 })),
  })
  .refine((data) => {
    return data.password === data.confirmation
  }, t("validation.passwordsMatch"))

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
  <UContainer>
    <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
      {{ t("auth.reset.title") }}
    </h2>
    <UForm
      class="mt-6 space-y-4"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField :label="t('common.password')" name="password" required>
        <UInput v-model="state.password" class="w-full" type="password" />
      </UFormField>
      <UFormField
        :label="t('auth.reset.repeatPassword')"
        name="confirmation"
        required
      >
        <UInput v-model="state.confirmation" class="w-full" type="password" />
      </UFormField>
      <UButton type="submit">{{ t("common.submit") }}</UButton>
    </UForm>
  </UContainer>
</template>
