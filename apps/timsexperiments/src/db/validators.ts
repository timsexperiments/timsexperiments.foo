import { z } from 'zod';

export const SubscriptionValidator = z.object({
  name: z.string(),
  email: z.string().email(),
  subscribed: z.boolean(),
});
