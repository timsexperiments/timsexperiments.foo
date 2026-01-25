import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("view-counter", () => {
    it("should have index", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "index.ts"))).toBe(true);
    });
});
