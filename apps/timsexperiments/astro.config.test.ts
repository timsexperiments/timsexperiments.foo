import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("astro.config.ts", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "astro.config.ts"))).toBe(true);
    });
});
