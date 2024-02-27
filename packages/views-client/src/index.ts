import { type View } from "@timsexperiments/view-storage";

export type GetViewsOptions = {
  page: string;
};

export type AddViewOpitons = {
  page: string;
};

export type ViewsClientOptions = {
  host: string;
};

/**
 * Client for interacting with the timsexperiments views api.
 */
export class ViewsClient {
  private readonly url;

  constructor({
    host = "https://api.timsexperiments.foo",
  }: ViewsClientOptions) {
    this.url = new URL(host);
  }

  /**
   * Retrieves views for a specific page.
   *
   * @param {GetViewsOptions} options - The options for retrieving views.
   * @param {string} options.page - The page for which to retrieve views.
   * @returns {Promise<View>} - A promise that resolves to the retrieved views.
   */
  async getViews({ page }: GetViewsOptions) {
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
  async addView({ page }: AddViewOpitons) {
    const url = this.viewsUrl;
    await fetch(url.href, {
      body: JSON.stringify({
        page,
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
