import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("tailwind.config.mjs", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        // Check for mjs or ts
        const exists = fs.existsSync(join(import.meta.dir, "tailwind.config.mjs")) || 
                       fs.existsSync(join(import.meta.dir, "tailwind.config.ts")) || 
                       fs.existsSync(join(import.meta.dir, "tailwind.config.js"));
        expect(exists).toBe(true);
    });
});
