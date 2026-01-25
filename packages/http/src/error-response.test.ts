import { describe, it, expect } from "bun:test";
import { errorResponse, notFoundResponse, badRequestResponse } from "./error-response";
import { HttpStatuses } from "./status";

describe("errorResponse", () => {
  it("should create a generic error response", async () => {
    const res = errorResponse({ message: "Something went wrong" });
    const json = await res.json();
    expect(res.status).toBe(HttpStatuses.STATUS_INTERNAL_ERROR);
    expect(json).toEqual({ message: "Something went wrong", status: 500 });
  });

  it("should create a not found response", async () => {
    const res = notFoundResponse({ message: "Not found" });
    expect(res.status).toBe(HttpStatuses.STATUS_NOT_FOUND);
  });

  it("should create a bad request response", async () => {
    const res = badRequestResponse({ message: "Bad request" });
    expect(res.status).toBe(HttpStatuses.STATUS_BAD_REQUEST);
  });
});
