import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ViewsClient, ViewClientError } from "./index";

describe("ViewsClient", () => {
  const mockFetch = mock();
  globalThis.fetch = mockFetch as unknown as typeof fetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should throw error for invalid constructor options", () => {
    expect(() => new ViewsClient({ host: "invalid-url" })).toThrow(ViewClientError);
  });

  it("should make a fetch request for getViews", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ views: 10 }),
    });

    const client = new ViewsClient({ host: "https://api.example.com" });
    const views = await client.getViews({ page: "https://mysite.com" });
    
    expect(views).toEqual({ views: 10 });
    expect(mockFetch).toHaveBeenCalled();
  });
});
