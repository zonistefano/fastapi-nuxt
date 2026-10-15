<script setup lang="ts">
import { useAuthenticationMethods } from "~/composables/useAuthenticationMethods"
import { startRegistration } from "@simplewebauthn/browser"
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser"
import {
  loginListPasskeys,
  loginRegistrationOptions,
  loginRegistrationVerify,
  loginRenamePasskey,
  loginDeletePasskey,
  loginUnlinkSocialAccount,
} from "~/api/generated"
import type { PasskeyRead } from "~/api/generated"
import { passkeyCancelled } from "~/utilities/passkeys"

const auth = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()
const { t } = useI18n()
const localePath = useLocalePath()
const name = ref("")
const passkeys = ref<PasskeyRead[]>([])
const busy = ref(false)
const { data: methods } = await useAuthenticationMethods()

async function perform(action: () => Promise<unknown>) {
  busy.value = true
  try {
    await action()
  } catch (error) {
    if (!passkeyCancelled(error))
      toast.add({ title: t("notifications.updateError"), color: "error" })
  } finally {
    busy.value = false
  }
}
async function load() {
  passkeys.value = await loginListPasskeys({ client: $api })
}
onMounted(async () => {
  if (methods.value?.passkeys) await perform(load)
})

async function register() {
  if (!name.value.trim()) return
  await perform(async () => {
    const challenge = await loginRegistrationOptions({ client: $api })
    const credential = await startRegistration({
      optionsJSON:
        challenge.options as unknown as PublicKeyCredentialCreationOptionsJSON,
    })
    await loginRegistrationVerify({
      client: $api,
      body: {
        ceremony_id: challenge.ceremony_id,
        name: name.value.trim(),
        credential: { ...credential },
      },
    })
    name.value = ""
    auth.clearSession()
    toast.add({ title: t("auth.methods.sessionChanged") })
    await navigateTo(localePath("/login"))
  })
}
async function rename(passkey: PasskeyRead) {
  await perform(async () => {
    await loginRenamePasskey({
      client: $api,
      path: { passkey_id: passkey.id },
      body: { name: passkey.name },
    })
    await load()
  })
}
async function remove(passkey: PasskeyRead) {
  await perform(async () => {
    await loginDeletePasskey({ client: $api, path: { passkey_id: passkey.id } })
    auth.clearSession()
    toast.add({ title: t("auth.methods.sessionChanged") })
    await navigateTo(localePath("/login"))
  })
}
async function unlink(provider: string) {
  await perform(async () => {
    await loginUnlinkSocialAccount({ client: $api, path: { provider } })
    auth.clearSession()
    await navigateTo(localePath("/login"))
  })
}
</script>

<template>
  <UPageCard
    v-if="methods?.passkeys || methods?.social_providers.length"
    :title="t('auth.methods.title')"
  >
    <template v-if="methods?.passkeys">
      <h2 id="passkeys" class="font-semibold">
        {{ t("auth.methods.passkeysTitle") }}
      </h2>
      <UAlert :description="t('auth.methods.sessionWarning')" color="warning" />
      <UForm :state="{ name }" class="space-y-3" @submit="register">
        <UFormField :label="t('auth.methods.name')" name="name"
          ><UInput v-model="name" name="name" required maxlength="100"
        /></UFormField>
        <UButton
          type="submit"
          :loading="busy"
          :label="t('auth.methods.register')"
        />
      </UForm>
      <div v-for="passkey in passkeys" :key="passkey.id" class="flex gap-2">
        <UInput
          v-model="passkey.name"
          :aria-label="t('auth.methods.name')"
          maxlength="100"
        />
        <UButton
          :label="t('common.save')"
          :loading="busy"
          @click="rename(passkey)"
        />
        <UButton
          color="error"
          :label="t('auth.methods.remove')"
          :loading="busy"
          @click="remove(passkey)"
        />
      </div>
    </template>
    <div
      v-for="provider in methods?.social_providers"
      :key="provider"
      class="flex gap-2"
    >
      <UButton
        :label="t('auth.methods.link', { provider })"
        @click="auth.socialLogin(provider, true)"
      />
      <UButton
        color="error"
        :label="t('auth.methods.unlink', { provider })"
        :loading="busy"
        @click="unlink(provider)"
      />
    </div>
  </UPageCard>
</template>
