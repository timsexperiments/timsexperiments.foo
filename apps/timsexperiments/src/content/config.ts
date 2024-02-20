import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    status: z.enum(['draft', 'pre-release', 'published']),
    tldr: z.string(),
    estimate: z.number(),
  }),
});

export const collections = { blog };
