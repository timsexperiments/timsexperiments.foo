import { describe, it, expect, mock } from "bun:test";
import { createDb } from "./client";

// Mock @libsql/client
mock.module("@libsql/client", () => ({
  createClient: () => ({
    execute: () => {},
  }),
}));

describe("createDb", () => {
  it("should create a drizzle instance", () => {
    const db = createDb({ authToken: "token", url: "libsql://test.db" });
    expect(db).toBeDefined();
  });
});
