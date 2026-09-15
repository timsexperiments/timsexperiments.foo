import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("api/subscriptions/index.ts", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "index.ts"))).toBe(true);
    });
});
