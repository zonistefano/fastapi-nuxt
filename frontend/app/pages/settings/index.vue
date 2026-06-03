<script setup lang="ts">
import * as z from "zod"
import type { IUserProfileUpdate } from "~/types"
import type { FormSubmitEvent } from "@nuxt/ui"

const authStore = useAuthStore()

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email"),
  original: !authStore.profile.hashed_password
    ? z.string().optional()
    : z.string(),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: authStore.profile.full_name ? authStore.profile.full_name : undefined,
  email: authStore.profile.email,
  original: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  const profile = {} as IUserProfileUpdate
  if (
    (!authStore.profile.hashed_password && !event.data.original) ||
    (authStore.profile.hashed_password && event.data.original)
  ) {
    if (event.data.original) profile.original = event.data.original
    if (event.data.email) {
      profile.email = event.data.email
      if (event.data.name !== undefined) profile.full_name = event.data.name
      await authStore.updateUserProfile(profile)
      state.name = authStore.profile.full_name
      state.email = authStore.profile.email
    }
  }
}

async function validate() {
  await authStore.sendEmailValidation()
}
</script>

<template>
  <div class="mx-auto flex w-full flex-col gap-4 sm:gap-6 lg:max-w-2xl">
    <UForm :state="state" :schema="schema" class="space-y-4" @submit="submit">
      <UPageCard
        title="Profile"
        description="These informations will be displayed publicly."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      >
        <UButton
          label="Save changes"
          color="neutral"
          type="submit"
          class="w-fit lg:ms-auto"
        />
      </UPageCard>
      <UPageCard variant="subtle">
        <UFormField
          name="name"
          label="Name"
          description="Will appear on receipts, invoices, and other communication."
          class="flex items-start justify-between gap-4 max-sm:flex-col"
        >
          <UInput
            v-model="state.name"
            autocomplete="off"
            icon="i-heroicons-user"
          />
        </UFormField>

        <UFormField
          name="email"
          label="Email"
          description="Used to sign in, for email receipts and product updates."
          class="flex items-start justify-between gap-4 max-sm:flex-col"
        >
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="off"
            icon="i-heroicons-envelope"
          />
        </UFormField>

        <UFormField
          v-if="authStore.profile.hashed_password"
          name="original"
          label="Password"
          description="Enter your current password."
          class="flex items-start justify-between gap-4 max-sm:flex-col"
          required
        >
          <UInput id="original" v-model="state.original" type="password" />
        </UFormField>
      </UPageCard>
    </UForm>

    <UPageCard
      v-if="!authStore.profile.email_validated"
      title="Validate email address"
      description="Receive an email to validate your account"
    >
      <template #links>
        <UButton
          type="submit"
          label="Send email"
          color="neutral"
          @click="validate"
        />
      </template>
    </UPageCard>
  </div>
</template>
