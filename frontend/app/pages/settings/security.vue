<script setup lang="ts">
import * as z from "zod"
import QrcodeVue from "qrcode.vue"
import { apiAuth } from "@/api"
import type { IUserProfileUpdate, INewTOTP, IEnableTOTP } from "~/types"
import type { FormSubmitEvent } from "@nuxt/ui"

const authStore = useAuthStore()
const tokenStore = useTokenStore()
const totpModal = ref(false)
const totpNew = ref({} as INewTOTP)
const totpClaim = ref({} as IEnableTOTP)
const qrSize = 200

const schema = z
  .object({
    original: !authStore.profile.hashed_password
      ? z.string().optional()
      : z.string(),
    totp: z.boolean(),
    password: z.string().min(8, "Must be at least 8 characters").optional(),
    confirmation: z.string().min(8, "Must be at least 8 characters").optional(),
  })
  .refine((data) => {
    return data.password === data.confirmation
  }, "Passwords must match")

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  original: undefined,
  totp: authStore.profile.totp_secret,
  password: undefined,
  confirmation: undefined,
})

const modal_schema = z.object({
  claim: z.string().length(6, "Must be 6 number long"),
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
      const { data: response } = await apiAuth.requestNewTOTP(tokenStore.token)
      if (response.value) {
        totpNew.value.key = response.value.key
        totpNew.value.uri = response.value.uri
        totpClaim.value.uri = response.value.uri
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
      title="Security"
      :description="
        !authStore.profile.hashed_password
          ? 'Secure your account by adding a password, or enabling two-factor security. Or both.'
          : 'Secure your account further by enabling two-factor security. Any changes will require you to enter your original password.'
      "
    >
      <UForm :state="state" :schema="schema" class="space-y-4" @submit="submit">
        <UFormField
          v-if="authStore.profile.hashed_password"
          name="original"
          label="Original password"
          required
        >
          <UInput
            id="original"
            v-model="state.original"
            type="password"
            size="md"
          />
        </UFormField>

        <UFormField name="totp" label="Use two-factor authentication">
          <USwitch v-model="state.totp" />
        </UFormField>

        <UFormField name="password" label="New password">
          <UInput
            id="password"
            v-model="state.password"
            type="password"
            size="md"
          />
        </UFormField>

        <UFormField name="confirmation" label="Repeat new password">
          <UInput
            id="confirmation"
            v-model="state.confirmation"
            type="password"
            size="md"
          />
        </UFormField>

        <UButton type="submit" label="Save changes" color="neutral" />
      </UForm>
    </UPageCard>

    <UModal
      v-model="totpModal"
      title="Enable 2FA"
      icon="i-heroicons-qr-code"
      :ui="{ title: 'font-bold text-xl lg:text-2xl' }"
    >
      <template #body>
        <ol class="ml-6 list-decimal">
          <li>
            Download an authenticator app that supports Time-based One-Time
            Password (TOTP) for your mobile device.
          </li>
          <li>
            Open the app and scan the QR code below to pair your mobile with
            your account.
            <QrcodeVue
              :value="totpNew.uri"
              :size="qrSize"
              level="M"
              render-as="svg"
              class="mx-auto my-2"
            />
            <p>If you can't scan, you can type in the following key:</p>
            <p class="my-2 text-center font-semibold">{{ totpNew.key }}</p>
          </li>
          <li>
            Enter the code generated by your Authenticator app below to pair
            your account:
          </li>
        </ol>
        <UForm
          class="ml-6 space-y-4"
          :schema="modal_schema"
          :state="modal_state"
          @submit="enableTOTP"
        >
          <UFormField label="6-digit verification code" name="claim">
            <UInput v-model="modal_state.claim" />
          </UFormField>
          <div class="flex justify-end">
            <UButton type="submit" label="Enable" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
