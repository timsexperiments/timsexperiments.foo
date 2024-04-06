import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTableCreator,
  text,
} from "drizzle-orm/sqlite-core";

const sqliteTable = sqliteTableCreator((name) => `timsexperiments_${name}`);

export const views = sqliteTable(
  "views",
  {
    id: integer("id").primaryKey(),
    page: text("page", { length: 256 }).notNull(),
    path: text("path", { length: 256 }).notNull(),
    ipAddress: text("ip_address", { length: 40 }).notNull(),
    viewedAt: integer("viewed_at", { mode: "timestamp_ms" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (views) => ({
    ipPageIdx: index("ip_page_idx").on(views.ipAddress, views.page),
    pageIdx: index("page_idx").on(views.page),
  })
);

export type View = typeof views.$inferInsert;
export type ViewOptions = Partial<Omit<View, "viewedAt">>;
