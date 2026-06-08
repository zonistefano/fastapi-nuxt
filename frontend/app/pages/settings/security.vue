<script setup lang="ts">
import * as z from "zod"
import QrcodeVue from "qrcode.vue"
import { apiAuth } from "@/api"
import type { IUserProfileUpdate, INewTOTP, IEnableTOTP } from "~/types"
import type { FormSubmitEvent } from "@nuxt/ui"

const authStore = useAuthStore()
const { t } = useI18n()
const totpModal = ref(false)
const totpNew = ref({} as INewTOTP)
const totpClaim = ref({} as IEnableTOTP)
const qrSize = 200

const schema = z
  .object({
    original: !authStore.profile.hashed_password
      ? z.string().optional()
      : z.string(t("validation.stringRequired")),
    totp: z.boolean(),
    password: z
      .string()
      .min(8, t("validation.minCharacters", { count: 8 }))
      .optional(),
    confirmation: z
      .string()
      .min(8, t("validation.minCharacters", { count: 8 }))
      .optional(),
  })
  .refine((data) => {
    return data.password === data.confirmation
  }, t("validation.passwordsMatch"))

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  original: undefined,
  totp: authStore.profile.totp_secret,
  password: undefined,
  confirmation: undefined,
})

const modal_schema = z.object({
  claim: z
    .string(t("validation.stringRequired"))
    .length(6, t("validation.codeLength", { count: 6 })),
})

type modal_Schema = z.output<typeof modal_schema>

const modal_state = reactive<Partial<modal_Schema>>({
  claim: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  const profile = {} as IUserProfileUpdate
  if (
    (!authStore.profile.hashed_password && !event.data.original) ||
    (authStore.profile.hashed_password && event.data.original)
  ) {
    if (event.data.original) profile.original = event.data.original
    if (event.data.password && event.data.password !== event.data.original) {
      profile.password = event.data.password
      await authStore.updateUserProfile(profile)
    }
    if (event.data.totp !== authStore.profile.totp_secret && event.data.totp) {
      const response = await apiAuth.requestNewTOTP()
      if (response) {
        totpNew.value.key = response.key
        totpNew.value.uri = response.uri
        totpClaim.value.uri = response.uri
        totpClaim.value.password = event.data.original
        totpModal.value = true
      }
    }
    if (event.data.totp !== authStore.profile.totp_secret && !event.data.totp) {
      await authStore.disableTOTPAuthentication(profile)
    }
  }
}

async function enableTOTP(event: FormSubmitEvent<modal_Schema>) {
  totpClaim.value.claim = event.data.claim
  await authStore.enableTOTPAuthentication(totpClaim.value)
  totpModal.value = false
}
</script>

<template>
  <div class="mx-auto flex w-full flex-col gap-4 sm:gap-6 lg:max-w-2xl">
    <UPageCard
      :title="t('settings.security.title')"
      :description="
        !authStore.profile.hashed_password
          ? t('settings.security.descriptionWithoutPassword')
          : t('settings.security.descriptionWithPassword')
      "
    >
      <UForm :state="state" :schema="schema" class="space-y-4" @submit="submit">
        <UFormField
          v-if="authStore.profile.hashed_password"
          name="original"
          :label="t('settings.security.originalPassword')"
          required
        >
          <UInput
            id="original"
            v-model="state.original"
            type="password"
            size="md"
          />
        </UFormField>

        <UFormField name="totp" :label="t('settings.security.useTotp')">
          <USwitch v-model="state.totp" />
        </UFormField>

        <UFormField name="password" :label="t('settings.security.newPassword')">
          <UInput
            id="password"
            v-model="state.password"
            type="password"
            size="md"
          />
        </UFormField>

        <UFormField
          name="confirmation"
          :label="t('settings.security.repeatNewPassword')"
        >
          <UInput
            id="confirmation"
            v-model="state.confirmation"
            type="password"
            size="md"
          />
        </UFormField>

        <UButton
          type="submit"
          :label="t('common.saveChanges')"
          color="neutral"
        />
      </UForm>
    </UPageCard>

    <UModal
      v-model="totpModal"
      :title="t('settings.security.enableTitle')"
      icon="i-heroicons-qr-code"
      :ui="{ title: 'font-bold text-xl lg:text-2xl' }"
    >
      <template #body>
        <ol class="ml-6 list-decimal">
          <li>
            {{ t("settings.security.enableStepDownload") }}
          </li>
          <li>
            {{ t("settings.security.enableStepScan") }}
            <QrcodeVue
              :value="totpNew.uri"
              :size="qrSize"
              level="M"
              render-as="svg"
              class="mx-auto my-2"
            />
            <p>{{ t("settings.security.manualKey") }}</p>
            <p class="my-2 text-center font-semibold">{{ totpNew.key }}</p>
          </li>
          <li>
            {{ t("settings.security.enableStepVerify") }}
          </li>
        </ol>
        <UForm
          class="ml-6 space-y-4"
          :schema="modal_schema"
          :state="modal_state"
          @submit="enableTOTP"
        >
          <UFormField :label="t('settings.security.sixDigitCode')" name="claim">
            <UInput v-model="modal_state.claim" />
          </UFormField>
          <div class="flex justify-end">
            <UButton type="submit" :label="t('settings.security.enable')" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
