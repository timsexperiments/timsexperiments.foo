import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("tsconfig.json", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "tsconfig.json"))).toBe(true);
    });
});
