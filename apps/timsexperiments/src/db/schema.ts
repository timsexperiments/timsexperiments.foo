import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import * as z from 'zod';

export const Subscription = sqliteTable(
  'subscriptions',
  {
    id: integer('id').primaryKey(),
    name: text('name'),
    email: text('email'),
    subscribed: integer('subscribed', { mode: 'boolean' }),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default(
      sql`CURRENT_TIMESTAMP`
    ),
    updated_at: integer('updated_at', { mode: 'timestamp_ms' }).default(
      sql`CURRENT_TIMESTAMP`
    ),
  },
  (table) => [unique('unique_email_idx').on(table.email)]
);

export const SubscriptionValidator = z.object({
  name: z.string(),
  email: z.string().email(),
  subscribed: z.boolean(),
});

export default {
  Subscription,
};
