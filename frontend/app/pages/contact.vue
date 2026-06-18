<script setup lang="ts">
import * as z from "zod"
import type { ISendEmail } from "~/types"
import type { FormSubmitEvent } from "@nuxt/ui"
import { apiService } from "@/api"

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
  <UContainer>
    <UPageHeader
      :title="t('contact.title')"
      :description="t('contact.description')"
    />

    <UPageBody>
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <UPageCard variant="subtle">
          <UForm
            :state="state"
            :schema="schema"
            class="space-y-4"
            @submit="submit"
          >
            <UFormField :label="t('common.email')" name="email" required>
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                icon="i-heroicons-envelope"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('contact.message')" name="message" required>
              <UTextarea
                v-model="state.message"
                :rows="8"
                :maxrows="12"
                autoresize
                class="w-full"
              />
            </UFormField>

            <UButton
              type="submit"
              color="neutral"
              :label="t('common.submit')"
            />
          </UForm>
        </UPageCard>

        <div class="space-y-4">
          <UPageFeature
            :title="t('contact.address')"
            :description="t('contact.addressValue')"
            icon="i-heroicons-map-pin"
            orientation="vertical"
          />

          <UPageFeature
            :title="t('contact.phone')"
            :description="t('contact.phoneValue')"
            icon="i-heroicons-phone"
            orientation="vertical"
          />

          <UPageFeature
            :title="t('contact.emailAddress')"
            :description="t('contact.emailValue')"
            icon="i-heroicons-at-symbol"
            orientation="vertical"
          />
        </div>
      </div>
    </UPageBody>
  </UContainer>
</template>
