import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  verbose: true,
  strict: true,
});
