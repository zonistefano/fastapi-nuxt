<script setup lang="ts">
import * as z from "zod"
import type { ISendEmail } from "~/types"
import { apiService } from "@/api"
import type { FormSubmitEvent } from "@nuxt/ui"

const toast = useToast()

const schema = z.object({
  email: z.string().email("Invalid email"),
  message: z
    .string()
    .min(10, "Must be at least 10 characters")
    .max(500, "Must be at most 500 characters"),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  message: undefined,
})

async function submit(event: FormSubmitEvent<Schema>) {
  const data: ISendEmail = {
    email: event.data.email,
    subject: `Website contact from: ${event.data.email} `,
    content: event.data.message,
  }
  try {
    await apiService.postEmailContact(data)
    toast.add({
      title: "Message sent",
      description: "Thanks so much for contacting us.",
    })
    navigateTo("/")
  } catch (error) {
    toast.add({
      title: "Contact error",
      description:
        "Something went wrong with your email. Please check your details, or internet connection, and try again.",
      icon: "i-heroicons-exclamation-circle",
    })
  }
}
</script>

<template>
  <div class="flex flex-col lg:grid lg:grid-cols-10 lg:gap-8">
    <UPageSection
      class="lg:col-span-5"
      title="Contact Us"
      description="We would love to hear from you."
      :features="[
        {
          title: 'Address',
          description: '545 Mavis Island, Chicago, IL 99191',
          icon: 'i-heroicons-building-office-2',
        },
        {
          title: 'Phone Number',
          description: '+39333',
          icon: 'i-heroicons-phone',
        },
        {
          title: 'Email Address',
          description: 'hello@example.com',
          icon: 'i-heroicons-envelope',
        },
      ]"
      align="center"
    />
    <UForm
      class="mx-auto w-full max-w-sm space-y-4 py-24 sm:py-32 md:py-52 lg:col-span-5"
      :schema="schema"
      :state="state"
      @submit="submit"
    >
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" />
      </UFormField>
      <UFormField label="Message" name="message">
        <UTextarea v-model="state.message" autoresize :maxrows="10" />
      </UFormField>
      <UButton type="submit"> Submit </UButton>
    </UForm>
  </div>
</template>
