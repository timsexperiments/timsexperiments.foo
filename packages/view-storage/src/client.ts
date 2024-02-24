import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

export type CreateDbOptions = {
  host: string;
  username: string;
  password: string;
};

export function createDb({ host, username, password }: CreateDbOptions) {
  const client = new Client({
    host: host,
    username: username,
    password: password,
  });
  return drizzle(client);
}

export type ViewsDatabase = ReturnType<typeof createDb>;
