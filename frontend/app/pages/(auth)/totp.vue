<script setup lang="ts">
import * as z from "zod"
import { tokenIsTOTP } from "@/utilities"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({
  layout: "authentication",
  middleware: ["anonymous"],
})

const authStore = useAuthStore()
const tokenStore = useTokenStore()
const { t } = useI18n()
const localePath = useLocalePath()
const recovery = ref(false)
const recoveryCode = ref("")
const redirectRoute = "/"

const schema = z.object({
  claim: z
    .array(z.string(t("validation.stringRequired")))
    .length(6, t("validation.stringRequired")),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  claim: [] as string[],
})

async function submit(event: FormSubmitEvent<Schema>) {
  const code = event.data.claim.join("")
  await authStore.totpLogin(code)
  if (authStore.loggedIn) {
    await navigateTo(localePath(redirectRoute))
  }
}

async function recover() {
  if (!recoveryCode.value.trim()) return
  await authStore.totpLogin(recoveryCode.value.trim(), true)
  if (authStore.loggedIn) await navigateTo(localePath(redirectRoute))
}

onMounted(async () => {
  // Check if token exists
  if (!tokenStore.token || !tokenIsTOTP(tokenStore.token))
    return await navigateTo(localePath("/"))
})
</script>

<template>
  <UContainer>
    <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
      {{ t("auth.totp.title") }}
    </h2>
    <p class="mt-4 text-lg">
      {{ t("auth.totp.description") }}
    </p>
    <UForm
      v-if="!recovery"
      class="mt-6 space-y-4"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField
        :label="t('auth.totp.verificationCode')"
        name="claim"
        required
      >
        <UPinInput v-model="state.claim" :length="6" :separator="3" otp />
      </UFormField>
      <UButton type="submit" :label="t('common.submit')" />
    </UForm>
    <UForm
      v-else
      :state="{ recoveryCode }"
      class="mt-6 space-y-4"
      @submit="recover"
    >
      <UFormField :label="t('auth.totp.recoveryCode')" name="recoveryCode">
        <UInput v-model="recoveryCode" name="recoveryCode" required />
      </UFormField>
      <UButton type="submit" :label="t('common.submit')" />
    </UForm>
    <UButton
      class="mt-4"
      variant="link"
      :label="t(recovery ? 'auth.totp.useCode' : 'auth.totp.useRecovery')"
      @click="
        () => {
          recovery = !recovery
        }
      "
    />
  </UContainer>
</template>
