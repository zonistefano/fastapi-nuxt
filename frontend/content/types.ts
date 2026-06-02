import { z } from "@nuxt/content"

export const variantEnum = z.enum([
  "solid",
  "outline",
  "subtle",
  "soft",
  "ghost",
  "link",
])
export const colorEnum = z.enum([
  "primary",
  "secondary",
  "neutral",
  "error",
  "warning",
  "success",
  "info",
])
export const sizeEnum = z.enum(["xs", "sm", "md", "lg", "xl"])
export const orientationEnum = z.enum(["vertical", "horizontal"])

const baseSchema = {
  title: z.string().nonempty(),
  description: z.string().nonempty(),
}

export const linkSchema = z.object({
  label: z.string().nonempty(),
  to: z.string().nonempty(),
  icon: z.string().optional(),
  size: sizeEnum,
  trailing: z.boolean().optional(),
  target: z.string().optional(),
  color: colorEnum,
  variant: variantEnum,
})

export const imageSchema = z.object({
  src: z.string().nonempty(),
  alt: z.string().optional(),
  loading: z.enum(["lazy", "eager"]).optional(),
  srcset: z.string().optional(),
})

export const featureItemSchema = z.object({
  ...baseSchema,
  icon: z.string().nonempty(),
  class: z.string().optional(),
  image: z
    .object({
      light: z.string().nonempty(),
      dark: z.string().nonempty(),
    })
    .optional(),
  ui: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    leadingIcon: z.string().optional(),
    leading: z.string().optional(),
  }),
})

export const sectionSchema = z.object({
  headline: z.string().optional(),
  ...baseSchema,
  features: z.array(featureItemSchema),
})

export const userSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().nonempty(),
  to: z.string().nonempty(),
  avatar: imageSchema,
})

export const sectionWithLinksSchema = sectionSchema.extend({
  links: z.array(linkSchema),
})

export const testimonialUserSchema = userSchema.extend({
  target: z.string().nonempty(),
})
