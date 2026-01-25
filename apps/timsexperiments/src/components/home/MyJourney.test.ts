import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("MyJourney.astro", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "MyJourney.astro"))).toBe(true);
    });
});
