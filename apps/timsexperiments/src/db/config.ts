import schema from '@/db/schema';
import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql/web';

const client = createClient({
  url: import.meta.env.DATABASE_URL,
  authToken: import.meta.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle({
  client,
  schema,
});

export default db;
