import { describe, it, expect } from "bun:test";
import { corsHeaders } from "./cors";

describe("corsHeaders", () => {
  it("should return default headers", () => {
    const headers = corsHeaders();
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Vary"]).toBe("Origin");
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });

  it("should return private headers when isPublic is false", () => {
    const headers = corsHeaders({
      isPublic: false,
      allowedOrigin: "https://example.com",
    });
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://example.com");
  });

  it("should allow custom methods and headers", () => {
    const headers = corsHeaders({
      isPublic: true,
      allowedMethods: ["GET"],
      allowedHeaders: ["X-Custom"],
    });
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET");
    expect(headers["Access-Control-Allow-Headers"]).toBe("X-Custom");
  });
});
