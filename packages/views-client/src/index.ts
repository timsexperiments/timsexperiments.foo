import { type View } from "@timsexperiments/view-storage";
import * as v from "valibot";

const GetViewsSchema = v.object({
  page: v.pipe(v.string(), v.url()),
});

export type GetViewsOptions = v.InferOutput<typeof GetViewsSchema>;

const AddViewSchema = v.object({
  page: v.pipe(v.string(), v.url()),
});

export type AddViewOpitons = v.InferOutput<typeof AddViewSchema>;

const ViewsClientOptionsSchema = v.object({
  host: v.pipe(v.string(), v.url()),
});

export type ViewsClientOptions = v.InferOutput<typeof ViewsClientOptionsSchema>;

/**
 * Client for interacting with the timsexperiments views api.
 */
export class ViewsClient {
  private readonly url;

  constructor(options: ViewsClientOptions) {
    const parsed = v.safeParse(ViewsClientOptionsSchema, options);
    if (!parsed.success) {
      throw new ViewClientError(
        "Invalid options provided: " + JSON.stringify(parsed.issues)
      );
    }

    const { host } = parsed.output;
    this.url = new URL(host);
  }

  /**
   * Retrieves views for a specific page.
   *
   * @param {GetViewsOptions} options - The options for retrieving views.
   * @param {string} options.page - The page for which to retrieve views.
   * @returns {Promise<View>} - A promise that resolves to the retrieved views.
   */
  async getViews(options: GetViewsOptions) {
    const parsed = v.safeParse(GetViewsSchema, options);
    if (!parsed.success) {
      throw new ViewClientError(
        "Invalid options provided: " + JSON.stringify(parsed.issues)
      );
    }
    const { page } = parsed.output;
    const url = this.viewsUrl;
    url.searchParams.append("page", page);
    const response = await fetch(url.href);
    return (await response.json()) as View;
  }

  /**
   * Adds a view for a specific page.
   *
   * @param {AddViewOptions} options - The options for adding a view.
   * @param {string} options.page - The page for which to add a view.
   * @returns {Promise<void>} - A promise that resolves when the view is added successfully.
   */
  async addView(options: AddViewOpitons) {
    const parsed = v.safeParse(AddViewSchema, options);
    if (!parsed.success) {
      throw new ViewClientError(
        "Invalid options provided: " + JSON.stringify(parsed.issues)
      );
    }
    const { page } = parsed.output;
    const pageUrl = new URL(page);
    const url = this.viewsUrl;
    await fetch(url.href, {
      method: "POST",
      body: JSON.stringify({
        page: pageUrl.href,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private get viewsUrl() {
    const url = this.url;
    url.pathname = "/views/";
    return url;
  }
}

export default ViewsClient;

export class ViewClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ViewClientError";
  }
}
