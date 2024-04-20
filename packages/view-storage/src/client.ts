import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

export type CreateDbOptions = {
  url: string;
  authToken?: string;
};

export function createDb({ url, authToken }: CreateDbOptions) {
  const client = createClient({
    url,
    authToken,
  });
  return drizzle(client);
}

export type ViewsDatabase = ReturnType<typeof createDb>;
