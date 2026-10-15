<script setup lang="ts">
import { browserSupportsWebAuthn } from "@simplewebauthn/browser"
import { loginListPasskeys, loginLoginMethods } from "~/api/generated"
import {
  deferPasskeyEnrollment,
  passkeyEnrollmentDeferred,
} from "~/utilities/passkeys"

const auth = useAuthStore()
const { $api, $publicApi } = useNuxtApp()
const config = useAppConfig().auth.passkeyEnrollment
const { t } = useI18n()
const localePath = useLocalePath()
const mounted = ref(false)
const visible = ref(false)
const owner = ref("")
let attempt = 0

onMounted(() => {
  mounted.value = true
})
onBeforeUnmount(() => {
  attempt++
})

watch(
  () =>
    [
      mounted.value,
      auth.loggedIn,
      auth.id,
      auth.passkeyEnrollmentPending,
    ] as const,
  async ([ready, loggedIn, id, pending]) => {
    if (!ready) return
    if (!loggedIn) {
      attempt++
      visible.value = false
      return
    }
    if (!pending) return
    const current = ++attempt
    auth.passkeyEnrollmentPending = false
    visible.value = false
    if (
      !config.enabled ||
      !browserSupportsWebAuthn() ||
      passkeyEnrollmentDeferred(id)
    )
      return
    try {
      const methods = await loginLoginMethods({ client: $publicApi })
      if (!methods.passkeys) return
      const keys = await loginListPasskeys({ client: $api })
      if (
        current === attempt &&
        auth.loggedIn &&
        auth.id === id &&
        keys.length === 0
      ) {
        owner.value = id
        visible.value = true
      }
    } catch {
      // An invitation must never interrupt access to the application.
    }
  },
)

function dismiss() {
  visible.value = false
  deferPasskeyEnrollment(owner.value, config.cooldownDays)
}
</script>

<template>
  <UAlert
    v-if="visible && auth.loggedIn && auth.id === owner"
    class="m-4"
    :title="t('auth.passkeyEnrollment.title')"
    :description="t('auth.passkeyEnrollment.description')"
    :actions="[
      {
        label: t('auth.passkeyEnrollment.create'),
        to: `${localePath('/settings/security')}#passkeys`,
        onClick: dismiss,
      },
      {
        label: t('auth.passkeyEnrollment.later'),
        color: 'neutral',
        variant: 'outline',
        onClick: dismiss,
      },
    ]"
    close
    @update:open="dismiss"
  />
</template>
