<script setup lang="ts">
import * as z from "zod"
import type { FormSubmitEvent } from "@nuxt/ui"
import type { Reauthentication } from "~/api/generated"

const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const localePath = useLocalePath()
const state = reactive({ password: "", claim: "" })
const schema = computed(() =>
  z.object({
    password: auth.hashed_password ? z.string().min(1) : z.string().optional(),
    claim: auth.totp_secret
      ? z.string().regex(/^\d{6}$/)
      : z.string().optional(),
  }),
)

async function submit(event: FormSubmitEvent<Reauthentication>) {
  if (await auth.reauthenticate(event.data)) {
    state.password = ""
    state.claim = ""
    toast.add({
      title: t("auth.reauth.success"),
      description: t("auth.reauth.retry"),
    })
  }
}
function clearCredentials() {
  state.password = ""
  state.claim = ""
}
async function signInAgain() {
  const revocation = auth.logOut()
  await navigateTo(localePath("/login"))
  await revocation
}
</script>

<template>
  <UModal
    v-model:open="auth.reauthenticationRequired"
    :title="t('auth.reauth.title')"
    :description="t('auth.reauth.description')"
    @after:leave="clearCredentials"
  >
    <template #body>
      <UForm
        v-if="auth.hashed_password || auth.totp_secret"
        :state="state"
        :schema="schema"
        class="space-y-4"
        @submit="submit"
      >
        <UFormField
          v-if="auth.hashed_password"
          name="password"
          :label="t('common.password')"
        >
          <UInput
            v-model="state.password"
            name="password"
            type="password"
            autocomplete="current-password"
          />
        </UFormField>
        <UFormField
          v-if="auth.totp_secret"
          name="claim"
          :label="t('auth.totp.verificationCode')"
        >
          <UInput
            v-model="state.claim"
            name="claim"
            autocomplete="one-time-code"
          />
        </UFormField>
        <UButton type="submit" :label="t('common.submit')" />
      </UForm>
      <UButton
        v-else
        :label="t('auth.reauth.signInAgain')"
        @click="signInAgain"
      />
    </template>
  </UModal>
</template>
