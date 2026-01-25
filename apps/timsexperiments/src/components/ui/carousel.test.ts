import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("ui/carousel.tsx", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "carousel.tsx"))).toBe(true);
    });
});
