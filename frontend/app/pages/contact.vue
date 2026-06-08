<script setup lang="ts">
import * as z from "zod"
import type { ISendEmail } from "~/types"
import { apiService } from "@/api"
import type { FormSubmitEvent } from "@nuxt/ui"

const toast = useToast()
const { t } = useI18n()

const schema = z.object({
  email: z.email(t("validation.invalidEmail")),
  message: z
    .string(t("validation.stringRequired"))
    .min(10, t("validation.minCharacters", { count: 10 }))
    .max(500, t("validation.maxCharacters", { count: 500 })),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  message: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  const data: ISendEmail = {
    email: event.data.email,
    subject: t("contact.emailSubject", { email: event.data.email }),
    content: event.data.message,
  }
  try {
    await apiService.postEmailContact(data)
    toast.add({
      title: t("contact.sentTitle"),
      description: t("contact.sentDescription"),
    })
    navigateTo("/")
  } catch {
    toast.add({
      title: t("contact.errorTitle"),
      description: t("contact.errorDescription"),
      icon: "i-heroicons-exclamation-circle",
    })
  }
}
</script>

<template>
  <div class="flex flex-col lg:grid lg:grid-cols-10 lg:gap-8">
    <UPageSection
      class="lg:col-span-5"
      :title="t('contact.title')"
      :description="t('contact.description')"
      :features="[
        {
          title: t('contact.address'),
          description: t('contact.addressValue'),
          icon: 'i-heroicons-building-office-2',
        },
        {
          title: t('contact.phone'),
          description: t('contact.phoneValue'),
          icon: 'i-heroicons-phone',
        },
        {
          title: t('contact.emailAddress'),
          description: t('contact.emailValue'),
          icon: 'i-heroicons-envelope',
        },
      ]"
      align="center"
    />
    <UForm
      class="mx-auto w-full max-w-sm space-y-4 py-24 sm:py-32 md:py-52 lg:col-span-5"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField :label="t('common.email')" name="email">
        <UInput v-model="state.email" />
      </UFormField>
      <UFormField :label="t('contact.message')" name="message">
        <UTextarea v-model="state.message" autoresize :maxrows="10" />
      </UFormField>
      <UButton type="submit">{{ t("common.submit") }}</UButton>
    </UForm>
  </div>
</template>
