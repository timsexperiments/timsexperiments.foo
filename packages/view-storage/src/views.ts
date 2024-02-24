import { eq, sql } from "drizzle-orm";
import { type ViewsDatabase } from "./client";
import { views, type View } from "./schema";

export type FindViewsOptions = {
  page: string;
  ipAddress: string;
};

/**
 * Represents a ViewsStorage class.
 *
 * This class is responsible for storing views data using a ViewsDatabase.
 *
 * @param {ViewsDatabase} db - The ViewsDatabase instance used for storing views data.
 */
export class ViewsStorage {
  constructor(private readonly db: ViewsDatabase) {}

  async add(...viewList: View[]) {
    return (await this.db.insert(views).values(viewList)).insertId;
  }

  async pageViews(page: string) {
    return (
      await this.db
        .select({
          page: views.page,
          views: sql<number>`count(${views.page})`,
        })
        .from(views)
        .where(eq(views.page, page))
        .groupBy(views.page)
    )[0];
  }
}
