import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

export type CreateDbOptions = {
  host: string;
  username: string;
  password: string;
};

export function createDb({ host, username, password }: CreateDbOptions) {
  const client = new Client({
    host: process.env["DATABASE_HOST"],
    username: process.env["DATABASE_USERNAME"],
    password: process.env["DATABASE_PASSWORD"],
  });
  return drizzle(client);
}

export type ViewsDatabase = ReturnType<typeof createDb>;
