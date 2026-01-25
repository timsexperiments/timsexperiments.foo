import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("Join.astro", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "Join.astro"))).toBe(true);
    });
});
