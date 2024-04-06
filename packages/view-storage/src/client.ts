import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

export type CreateDbOptions = {
  authToken: string;
  url: string;
};

export function createDb({ authToken, url }: CreateDbOptions) {
  const client = createClient({
    authToken,
    url,
  });
  return drizzle(client);
}

export type ViewsDatabase = ReturnType<typeof createDb>;
