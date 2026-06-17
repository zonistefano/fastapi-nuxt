<script setup>
const _props = defineProps({
  colorMode: { type: String, required: false, default: "light" },
  title: { type: String, required: false, default: "title" },
  description: { type: String, required: false, default: "" },
  width: { type: Number, required: false, default: 1200 },
  height: { type: Number, required: false, default: 600 },
})
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col items-center justify-center bg-white p-10 text-neutral-900 lg:p-[60px] dark:bg-neutral-900 dark:text-neutral-50"
  >
    <!-- Gradient background -->
    <div
      class="absolute top-0 right-0 bottom-0 left-0"
      :style="{
        backgroundImage: `radial-gradient(at 100% 100%, var(--ui-primary)21, transparent)`,
      }"
    />
    <div
      class="absolute top-0 right-0 bottom-0 left-0"
      :style="{
        backgroundImage: `radial-gradient(at 0% 0%, var(--ui-primary)1A, transparent)`,
      }"
    />

    <div class="relative flex flex-col items-center gap-5 text-center lg:gap-8">
      <div class="w-full items-center justify-center">
        <!-- Title -->
        <h1
          class="m-0 max-w-[700px] text-[48px] leading-tight font-bold lg:max-w-[1000px] lg:text-[80px]"
          style="
            display: block;
            line-clamp: 3;
            text-overflow: ellipsis;
            text-wrap: balance;
          "
        >
          {{ title }}
        </h1>
      </div>

      <!-- Description -->
      <p
        v-if="description"
        class="max-w-[650px] text-[24px] leading-relaxed opacity-70 lg:max-w-[900px] lg:text-[32px]"
      >
        {{ description }}
      </p>
    </div>
  </div>
</template>
