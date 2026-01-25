import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("ui/toaster.tsx", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "toaster.tsx"))).toBe(true);
    });
});
