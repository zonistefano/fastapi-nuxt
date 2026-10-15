<script setup lang="ts">
import * as z from "zod"
import {
  usersCreateUser,
  usersReadUserById,
  usersDeleteUserById,
  usersReadAllUsers,
  usersToggleState,
  usersUpdateUserById,
} from "~/api/generated"
import { generateUUID } from "@/utilities"
import type { FormSubmitEvent } from "@nuxt/ui"
import type {
  CustomUserRead,
  CustomUserUpdate,
  CustomUserCreate,
} from "~/api/generated"

definePageMeta({
  layout: "dashboard",
  middleware: ["moderator"],
})

const { $api } = useNuxtApp()
const { t } = useI18n()

const defaultColumns = [
  { id: "actions", header: t("moderation.edit") },
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

const authStore = useAuthStore()
const toast = useToast()
const page = ref(0)
const editing = ref<CustomUserRead | null>(null)
const deleting = ref<CustomUserRead | null>(null)
const editState = reactive({ full_name: "", email: "", role: "user" })
const editSchema = z.object({
  full_name: z.string(),
  email: z.email(),
  role: z.string().min(1),
})
async function editUser(user: CustomUserRead) {
  try {
    editing.value = await usersReadUserById({
      client: $api,
      path: { user_id: user.id },
    })
    Object.assign(editState, {
      full_name: editing.value.full_name ?? "",
      email: editing.value.email,
      role: editing.value.role ?? "user",
    })
  } catch {
    notifyError()
  }
}
async function saveUser() {
  if (!editing.value) return
  try {
    await usersUpdateUserById({
      client: $api,
      path: { user_id: editing.value.id },
      body: { ...editState },
    })
    editing.value = null
    await getAllUsers()
  } catch {
    notifyError()
  }
}
async function deleteUser() {
  if (!deleting.value) return
  try {
    await usersDeleteUserById({
      client: $api,
      path: { user_id: deleting.value.id },
    })
    deleting.value = null
    await getAllUsers()
  } catch {
    notifyError()
  }
}
async function changePage(delta: number) {
  page.value += delta
  await getAllUsers()
}
const selectedColumns = ref(defaultColumns)
const isNewUserModalOpen = ref(false)

function openNewUserModal() {
  isNewUserModalOpen.value = true
}
const userProfiles = ref([] as CustomUserRead[])

const columns = computed(() =>
  defaultColumns.filter((column) => selectedColumns.value.includes(column)),
)

function notifyError() {
  toast.add({
    title: t("notifications.updateError"),
    description: t("notifications.invalidRequest"),
    icon: "i-heroicons-exclamation-circle",
  })
}

async function getAllUsers() {
  try {
    userProfiles.value = await usersReadAllUsers({
      client: $api,
      query: { page: page.value },
    })
  } catch {
    notifyError()
  }
}

onMounted(async () => {
  await getAllUsers()
})

async function toggleActive(email: string, is_active: boolean) {
  const user = userProfiles.value.find((user) => user.email === email)
  const previous = user?.is_active
  if (user) user.is_active = is_active
  try {
    await usersToggleState({ client: $api, body: { user_email: email } })
  } catch {
    notifyError()
    if (user && previous !== undefined) user.is_active = previous
  }
}

async function toggleMod(id: string, is_superuser: boolean) {
  const user = userProfiles.value.find((user) => user.id === id)
  const previous = user?.is_superuser
  if (user) user.is_superuser = is_superuser
  const data: CustomUserUpdate = {
    is_superuser: is_superuser,
  }
  try {
    await usersUpdateUserById({
      client: $api,
      path: { user_id: id },
      body: data,
    })
  } catch {
    notifyError()
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
    const data: CustomUserCreate = {
      email: event.data.email,
      password: generateUUID(),
      full_name: event.data.full_name ? event.data.full_name : "",
    }
    try {
      await usersCreateUser({ client: $api, body: data })
    } catch {
      notifyError()
      return
    }
    toast.add({
      title: t("moderation.userCreated"),
      description: t("moderation.userCreatedDescription"),
    })
    isNewUserModalOpen.value = false
    modal_state.full_name = undefined
    modal_state.email = undefined
    await getAllUsers()
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
          <UButton
            icon="i-lucide-plus"
            size="md"
            class="rounded-full"
            :aria-label="t('moderation.newUser')"
            @click="openNewUserModal"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <USelectMenu
            v-model="selectedColumns"
            icon="i-heroicons-adjustments-horizontal-solid"
            :items="defaultColumns"
            label-key="header"
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

      <UButton
        :label="t('auth.reauth.title')"
        @click="
          () => {
            authStore.reauthenticationRequired = true
          }
        "
      />
      <UButton :label="t('moderation.refresh')" @click="getAllUsers" />
      <UModal
        :open="!!editing"
        :title="t('moderation.edit')"
        @update:open="
          (open) => {
            if (!open) editing = null
          }
        "
      >
        <template #body>
          <UForm
            :state="editState"
            :schema="editSchema"
            class="space-y-4"
            @submit="saveUser"
          >
            <UFormField name="full_name" :label="t('moderation.name')"
              ><UInput v-model="editState.full_name" name="full_name"
            /></UFormField>
            <UFormField name="email" :label="t('common.email')"
              ><UInput v-model="editState.email" name="email"
            /></UFormField>
            <UFormField name="role" :label="t('moderation.role')"
              ><UInput v-model="editState.role" name="role"
            /></UFormField>
            <UButton type="submit" :label="t('common.save')" />
          </UForm>
        </template>
      </UModal>
      <UModal
        :open="!!deleting"
        :title="t('moderation.delete')"
        :description="t('moderation.deleteDescription')"
        @update:open="
          (open) => {
            if (!open) deleting = null
          }
        "
      >
        <template #body
          ><UButton
            color="error"
            :label="t('moderation.delete')"
            @click="deleteUser"
        /></template>
      </UModal>
      <UTable :data="userProfiles" :columns="columns" class="w-full">
        <template #actions-cell="{ row }">
          <UButton
            :label="t('moderation.edit')"
            @click="editUser(row.original)"
          />
          <UButton
            color="error"
            :label="t('moderation.delete')"
            @click="
              () => {
                deleting = row.original
              }
            "
          />
        </template>
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
            :label="row.original.totp ? t('common.yes') : t('common.no')"
            :color="row.original.totp ? 'success' : 'error'"
            variant="subtle"
          />
        </template>
      </UTable>
      <div class="flex gap-2">
        <UButton
          :label="t('moderation.previous')"
          :disabled="page === 0"
          @click="changePage(-1)"
        />
        <UButton
          :label="t('moderation.next')"
          :disabled="!userProfiles.length"
          @click="changePage(1)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
