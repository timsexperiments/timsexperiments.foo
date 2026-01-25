import { describe, it, expect } from "bun:test";
import { views } from "./schema";

describe("schema", () => {
  it("should define views table", () => {
    expect(views).toBeDefined();
    expect(views.page.name).toBe("page");
    expect(views.ipAddress.name).toBe("ip_address");
  });
});
