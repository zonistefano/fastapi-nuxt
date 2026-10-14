<script setup lang="ts">
import * as z from "zod"
import { apiAuth } from "@/api"
import { generateUUID } from "@/utilities"
import type { FormSubmitEvent } from "@nuxt/ui"
import type {
  IUserProfile,
  IUserProfileUpdate,
  IUserProfileCreate,
} from "~/types"

definePageMeta({
  layout: "dashboard",
  middleware: ["moderator"],
})

const { t } = useI18n()

const defaultColumns = [
  {
    accessorKey: "id",
    header: "#",
    sortable: true,
  },
  {
    accessorKey: "full_name",
    header: t("moderation.name"),
    sortable: true,
  },
  {
    accessorKey: "email",
    header: t("common.email"),
    sortable: true,
  },
  {
    accessorKey: "is_active",
    header: t("moderation.status"),
  },
  {
    accessorKey: "is_superuser",
    header: t("moderation.moderator"),
  },
  {
    accessorKey: "hashed_password",
    header: t("moderation.passwordAuthentication"),
  },
  {
    accessorKey: "email_validated",
    header: t("moderation.validated"),
  },
  {
    accessorKey: "totp_secret",
    header: t("moderation.twoFactor"),
  },
]

const toast = useToast()
const selectedColumns = ref(defaultColumns)
const isNewUserModalOpen = ref(false)

function openNewUserModal() {
  isNewUserModalOpen.value = true
}
const userProfiles = ref([] as IUserProfile[])

const columns = computed(() =>
  defaultColumns.filter((column) => selectedColumns.value.includes(column)),
)

async function getAllUsers() {
  const { data: response } = await apiAuth.getAllUsers()
  if (response.value && response.value.length)
    userProfiles.value = response.value
}

onMounted(async () => {
  await getAllUsers()
})

async function toggleActive(email: string, is_active: boolean) {
  const user = userProfiles.value.find((user) => user.email === email)
  const previous = user?.is_active
  if (user) user.is_active = is_active
  const data: IUserProfileUpdate = {
    email: email,
    is_active: is_active,
  }
  const response = await apiAuth.toggleUserState(data)
  if (!response || !response.msg) {
    toast.add({
      title: t("notifications.updateError"),
      description: response ? response.msg : t("notifications.invalidRequest"),
      icon: "i-heroicons-exclamation-circle",
    })
    if (user && previous !== undefined) user.is_active = previous
  }
}

async function toggleMod(id: string, is_superuser: boolean) {
  const user = userProfiles.value.find((user) => user.id === id)
  const previous = user?.is_superuser
  if (user) user.is_superuser = is_superuser
  const data: IUserProfileUpdate = {
    is_superuser: is_superuser,
  }
  const response = await apiAuth.updateUserById(id, data)
  if (!response) {
    toast.add({
      title: t("notifications.updateError"),
      description: t("notifications.invalidRequest"),
      icon: "i-heroicons-exclamation-circle",
    })
    if (user && previous !== undefined) user.is_superuser = previous
  }
}

const modal_schema = z.object({
  full_name: z
    .string()
    .min(3, t("validation.nameMinCharacters", { count: 3 }))
    .optional(),
  email: z.email(t("validation.invalidEmail")),
})

type Schema = z.output<typeof modal_schema>

const modal_state = reactive<Partial<Schema>>({
  full_name: undefined,
  email: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  if (event.data.email) {
    const data: IUserProfileCreate = {
      email: event.data.email,
      password: generateUUID(),
      full_name: event.data.full_name ? event.data.full_name : "",
    }
    const response = await apiAuth.createUserProfile(data)
    if (!response) {
      toast.add({
        title: t("notifications.updateError"),
        description: t("notifications.invalidRequest"),
        icon: "i-heroicons-exclamation-circle",
      })
    } else {
      toast.add({
        title: t("moderation.userCreated"),
        description: t("moderation.userCreatedDescription"),
      })
    }
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar
        :title="t('moderation.users')"
        :badge="userProfiles.length"
        :ui="{ right: 'gap-3' }"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <USelectMenu
            icon="i-heroicons-adjustments-horizontal-solid"
            :items="['Backlog', 'Todo', 'In Progress', 'Done']"
            multiple
            class="hidden lg:block"
          >
            {{ t("moderation.display") }}
          </USelectMenu>
          <UButton
            :label="t('moderation.newUser')"
            trailing-icon="i-heroicons-plus"
            @click="openNewUserModal"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UModal
        v-model:open="isNewUserModalOpen"
        :title="t('moderation.newUser')"
        :description="t('moderation.newUserDescription')"
      >
        <template #body>
          <UForm
            class="space-y-4"
            :schema="modal_schema"
            :state="modal_state"
            @submit="submit"
          >
            <UFormField :label="t('moderation.profileName')" name="full_name">
              <UInput v-model="modal_state.full_name" />
            </UFormField>
            <UFormField :label="t('common.email')" name="email">
              <UInput v-model="modal_state.email" />
            </UFormField>
            <div class="flex justify-end">
              <UButton type="submit" :label="t('common.save')" />
            </div>
          </UForm>
        </template>
      </UModal>

      <UTable :data="userProfiles" :columns="columns" class="w-full">
        <template #is_active-cell="{ row }">
          <USwitch
            :model-value="row.original.is_active"
            @update:model-value="toggleActive(row.original.email, $event)"
          />
        </template>
        <template #is_superuser-cell="{ row }">
          <USwitch
            :model-value="row.original.is_superuser"
            @update:model-value="toggleMod(row.original.id, $event)"
          />
        </template>
        <template #hashed_password-cell="{ row }">
          <UBadge
            :label="
              row.original.hashed_password ? t('common.yes') : t('common.no')
            "
            :color="row.original.hashed_password ? 'success' : 'error'"
            variant="subtle"
          />
        </template>
        <template #email_validated-cell="{ row }">
          <UBadge
            :label="
              row.original.email_validated ? t('common.yes') : t('common.no')
            "
            :color="row.original.email_validated ? 'success' : 'error'"
            variant="subtle"
          />
        </template>
        <template #totp_secret-cell="{ row }">
          <UBadge
            :label="
              (row.original.totp ?? row.original.totp_secret)
                ? t('common.yes')
                : t('common.no')
            "
            :color="
              (row.original.totp ?? row.original.totp_secret)
                ? 'success'
                : 'error'
            "
            variant="subtle"
          />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
