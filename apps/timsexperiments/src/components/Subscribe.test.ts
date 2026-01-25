import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("Subscribe.astro", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "Subscribe.astro"))).toBe(true);
    });
});
