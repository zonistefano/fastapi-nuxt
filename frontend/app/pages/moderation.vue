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

const defaultColumns = [
  {
    accessorKey: "id",
    header: "#",
    sortable: true,
  },
  {
    accessorKey: "full_name",
    header: "Name",
    sortable: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    sortable: true,
  },
  {
    accessorKey: "is_active",
    header: "Status",
  },
  {
    accessorKey: "is_superuser",
    header: "Moderator",
  },
  {
    accessorKey: "hashed_password",
    header: "Password authentication",
  },
  {
    accessorKey: "email_validated",
    header: "Validated",
  },
  {
    accessorKey: "totp_secret",
    header: "2FA",
  },
]

const toast = useToast()
const selectedColumns = ref(defaultColumns)
const isNewUserModalOpen = ref(false)
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
  const data: IUserProfileUpdate = {
    email: email,
    is_active: is_active,
  }
  const response = await apiAuth.toggleUserState(data)
  if (!response || !response.msg) {
    toast.add({
      title: "Update error",
      description: response ? response.msg : "Invalid request.",
      icon: "i-heroicons-exclamation-circle",
    })
    if (user) user.is_active = !is_active
  }
}

async function toggleMod(id: string, is_superuser: boolean) {
  const data: IUserProfileUpdate = {
    is_superuser: is_superuser,
  }
  const response = await apiAuth.updateUserById(id, data)
  if (!response) {
    toast.add({
      title: "Update error",
      description: "Invalid request.",
      icon: "i-heroicons-exclamation-circle",
    })
    const user = userProfiles.value.find((user) => user.id === id)
    if (user) user.is_superuser = !is_superuser
  }
}

const modal_schema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters").optional(),
  email: z.string().email(),
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
        title: "Update error",
        description: "Invalid request.",
        icon: "i-heroicons-exclamation-circle",
      })
    } else {
      toast.add({
        title: "User created",
        description:
          "An email has been sent to the user with their new login details.",
      })
    }
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar
        title="Users"
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
            Display
          </USelectMenu>
          <UButton
            label="New user"
            trailing-icon="i-heroicons-plus"
            @click="isNewUserModalOpen = true"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UModal
        v-model:open="isNewUserModalOpen"
        title="New user"
        description="Create a new user and notify them."
      >
        <template #body>
          <UForm
            class="space-y-4"
            :schema="modal_schema"
            :state="modal_state"
            @submit="submit"
          >
            <UFormField label="Profile name" name="full_name">
              <UInput v-model="modal_state.full_name" />
            </UFormField>
            <UFormField label="Email" name="email">
              <UInput v-model="modal_state.email" />
            </UFormField>
            <div class="flex justify-end">
              <UButton type="submit" label="Save" />
            </div>
          </UForm>
        </template>
      </UModal>

      <UTable :data="userProfiles" :columns="columns" class="w-full">
        <template #is_active-data="{ row }">
          <USwitch
            v-model="row.is_active"
            @click="toggleActive(row.email, !row.is_active)"
          />
        </template>
        <template #is_superuser-data="{ row }">
          <USwitch
            v-model="row.is_superuser"
            @click="toggleMod(row.id, !row.is_superuser)"
          />
        </template>
        <template #hashed_password-data="{ row }">
          <UBadge
            :label="row.hashed_password ? 'Yes' : 'No'"
            :color="row.hashed_password ? 'success' : 'error'"
            variant="subtle"
          />
        </template>
        <template #email_validated-data="{ row }">
          <UBadge
            :label="row.email_validated ? 'Yes' : 'No'"
            :color="row.email_validated ? 'success' : 'error'"
            variant="subtle"
          />
        </template>
        <template #totp_secret-data="{ row }">
          <UBadge
            :label="row.totp_secret ? 'Yes' : 'No'"
            :color="row.totp_secret ? 'success' : 'error'"
            variant="subtle"
          />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
