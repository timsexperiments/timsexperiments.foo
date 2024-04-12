import { z } from 'astro:content';

export const SubscriptionValidator = z.object({
  name: z.string(),
  email: z.string().email(),
  subscribed: z.boolean(),
});
