import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("pages/rss.xml.js", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "rss.xml.js"))).toBe(true);
    });
});
