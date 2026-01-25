import { describe, it, expect } from "bun:test";
import { HttpStatuses } from "./status";

describe("HttpStatuses", () => {
  it("should have correct status codes", () => {
    expect(HttpStatuses.STATUS_OK).toBe(200);
    expect(HttpStatuses.STATUS_NOT_FOUND).toBe(404);
    expect(HttpStatuses.STATUS_INTERNAL_ERROR).toBe(500);
  });
});
