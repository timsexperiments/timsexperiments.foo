import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("package.json", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "package.json"))).toBe(true);
    });
});
