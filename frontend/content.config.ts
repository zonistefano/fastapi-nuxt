import {
  defineContentConfig,
  defineCollection,
  z,
  type DefinedCollection,
} from "@nuxt/content"
import {
  linkSchema,
  sectionSchema,
  featureItemSchema,
  orientationEnum,
  imageSchema,
} from "./content/types"

const locales = ["en", "it"] as const

const indexSchema = z.object({
  title: z.string().nonempty(),
  description: z.string().nonempty(),
  hero: sectionSchema.extend({
    headline: z.object({
      label: z.string().nonempty(),
      to: z.string().nonempty(),
      icon: z.string().nonempty(),
    }),
    links: z.array(linkSchema),
  }),
  sections: z.array(
    sectionSchema.extend({
      id: z.string().nonempty(),
      orientation: orientationEnum.optional(),
      features: z.array(featureItemSchema),
      links: z.array(linkSchema),
      reverse: z.boolean().optional(),
    }),
  ),
  features: sectionSchema.extend({
    items: z.array(featureItemSchema),
  }),
  testimonials: sectionSchema.extend({
    items: z.array(
      z.object({
        quote: z.string().nonempty(),
        user: z.object({
          name: z.string().nonempty(),
          description: z.string().nonempty(),
          to: z.string().nonempty(),
          target: z.string().nonempty(),
          avatar: imageSchema,
        }),
      }),
    ),
  }),
  cta: sectionSchema.extend({
    links: z.array(linkSchema),
  }),
})

const blogSchema = z.object({
  title: z.string().nonempty(),
  description: z.string().nonempty(),
  image: z.object({ src: z.string().nonempty() }),
  authors: z.array(
    z.object({
      name: z.string().nonempty(),
      to: z.string().nonempty(),
      avatar: z.object({ src: z.string().nonempty() }),
    }),
  ),
  date: z.string().nonempty(),
  badge: z.object({ label: z.string().nonempty() }),
})

export default defineContentConfig({
  collections: locales.reduce(
    (acc: Record<string, DefinedCollection>, locale) => {
      acc[`index_${locale}`] = defineCollection({
        source: {
          include: `${locale}/index.yml`,
          prefix: "/",
        },
        type: "data",
        schema: indexSchema,
      })

      acc[`pricing_${locale}`] = defineCollection({
        source: {
          include: `${locale}/pricing.yml`,
          prefix: "/",
        },
        type: "page",
        schema: z.object({
          plans: z.array(
            z.object({
              title: z.string().nonempty(),
              description: z.string().nonempty(),
              price: z.object({
                month: z.string().nonempty(),
                year: z.string().nonempty(),
              }),
              billing_period: z.string().nonempty(),
              billing_cycle: z.string().nonempty(),
              button: linkSchema,
              features: z.array(z.string().nonempty()),
              highlight: z.boolean().optional(),
            }),
          ),
          logos: z.object({
            title: z.string().nonempty(),
            icons: z.array(z.string()),
          }),
          faq: z.object({
            title: z.string().nonempty(),
            description: z.string().nonempty(),
            items: z.array(
              z.object({
                label: z.string().nonempty(),
                content: z.string().nonempty(),
              }),
            ),
          }),
        }),
      })

      acc[`changelog_${locale}`] = defineCollection({
        source: {
          include: `${locale}/changelog/**/*.md`,
          prefix: `/${locale}/changelog`,
        },
        type: "page",
        schema: z.object({
          title: z.string().nonempty(),
          description: z.string(),
          date: z.date(),
          image: z.string(),
        }),
      })

      acc[`blog_${locale}`] = defineCollection({
        source: {
          include: `${locale}/blog/**/*.md`,
          prefix: `/${locale}/blog`,
        },
        type: "page",
        schema: blogSchema,
      })

      acc[`docs_${locale}`] = defineCollection({
        source: {
          include: `${locale}/docs/**/*.md`,
          prefix: `/${locale}/docs`,
        },
        type: "page",
      })

      acc[`general_${locale}`] = defineCollection({
        source: {
          include: `${locale}/*.md`,
          prefix: `/${locale}`,
        },
        type: "page",
      })

      return acc
    },
    {},
  ),
})
