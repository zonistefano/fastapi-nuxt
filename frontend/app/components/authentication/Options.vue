<script setup lang="ts">
import { useAuthenticationMethods } from "~/composables/useAuthenticationMethods"
import { tokenIsTOTP } from "@/utilities"
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  WebAuthnAbortService,
} from "@simplewebauthn/browser"

const props = defineProps<{ conditional?: boolean }>()

const auth = useAuthStore()
const { t } = useI18n()
const localePath = useLocalePath()
const busy = ref(false)
const supported = ref(true)
let controller: AbortController | undefined
let disposed = false
let autofillStopped = false
defineExpose({ cancel })
const { data: methods } = await useAuthenticationMethods()

async function login(provider?: string) {
  cancel()
  busy.value = true
  try {
    if (provider) await auth.socialLogin(provider)
    else {
      const active = new AbortController()
      controller = active
      const result = await auth.passkeyLogin({ signal: active.signal })
      if (active.signal.aborted || result === false) return
    }
    await complete()
  } finally {
    busy.value = false
  }
}

async function complete() {
  if (auth.loggedIn) await navigateTo(localePath("/"))
  else if (tokenIsTOTP(useTokenStore().token))
    await navigateTo(localePath("/totp"))
}

function cancel() {
  autofillStopped = true
  controller?.abort()
  WebAuthnAbortService.cancelCeremony()
}

onMounted(async () => {
  supported.value = browserSupportsWebAuthn()
  if (!props.conditional || !methods.value?.passkeys || !supported.value) return
  try {
    if (
      !(await browserSupportsWebAuthnAutofill()) ||
      disposed ||
      autofillStopped
    )
      return
    controller = new AbortController()
    const signal = controller.signal
    if (await auth.passkeyLogin({ autofill: true, signal })) {
      if (!signal.aborted) await complete()
    }
  } catch {
    // Autofill is optional; explicit sign-in methods remain available.
  }
})
onBeforeUnmount(() => {
  disposed = true
  cancel()
})
</script>

<template>
  <div class="mb-4 flex flex-col gap-2">
    <UButton
      v-for="provider in methods?.social_providers"
      :key="provider"
      :label="t('auth.methods.social', { provider })"
      :loading="busy"
      @click="login(provider)"
    />
    <UButton
      v-if="methods?.passkeys"
      :label="t('auth.methods.passkey')"
      :loading="busy"
      :disabled="!supported"
      @click="login()"
    />
    <p v-if="methods?.passkeys && !supported" class="text-muted text-sm">
      {{ t("auth.methods.unsupported") }}
    </p>
  </div>
</template>
