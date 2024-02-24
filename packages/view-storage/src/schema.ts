import { sql } from "drizzle-orm";
import {
  index,
  mysqlTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const views = mysqlTable(
  "views",
  {
    id: serial("id").primaryKey(),
    page: varchar("page", { length: 256 }).notNull(),
    ipAddress: varchar("ip_address", { length: 40 }).notNull(),
    viewedAt: timestamp("viewed_at")
      .default(sql`CURRENT_TIMESTAMP()`)
      .notNull(),
  },
  (views) => ({
    ipPageIdx: index("ip_page_idx").on(views.ipAddress, views.page),
    pageIdx: index("page_idx").on(views.page),
  })
);

export type View = Omit<typeof views.$inferInsert, "viewedAt">;
