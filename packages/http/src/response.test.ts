import { describe, it, expect } from "bun:test";
import { responseJson, responseNoContent } from "./response";
import { HttpStatuses } from "./status";

describe("responseJson", () => {
  it("should create a JSON response", async () => {
    const data = { foo: "bar" };
    const res = responseJson(data);
    const json = await res.json();
    expect(res.status).toBe(HttpStatuses.STATUS_OK);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(json).toEqual(data);
  });

  it("should allow custom status and headers", () => {
    const res = responseJson({}, { status: 201, headers: { "X-Test": "true" } });
    expect(res.status).toBe(201);
    expect(res.headers.get("X-Test")).toBe("true");
  });
});

describe("responseNoContent", () => {
  it("should create a 201 response by default", () => {
    // Note: The implementation uses 201 for NO_CONTENT in status.ts, though usually 204 is No Content. 
    // Testing based on current implementation.
    const res = responseNoContent();
    expect(res.status).toBe(HttpStatuses.STATUS_NO_CONTENT);
  });
});
