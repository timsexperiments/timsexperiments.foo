import { NOW, column, defineDb, defineTable } from 'astro:db';

const Subscription = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    email: column.text(),
    subscribed: column.boolean(),
    created_at: column.date({ default: NOW }),
    updated_at: column.date({ default: NOW }),
  },
  indexes: {
    unique_email_idx: {
      on: ['email'],
      unique: true,
    },
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { Subscription },
});
