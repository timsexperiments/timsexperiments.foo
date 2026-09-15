import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("lab/index.astro", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "index.astro"))).toBe(true);
    });
});
