import { describe, it, expect } from "bun:test";
import { join } from "path";

describe("Contact.astro", () => {
    it("should exist", async () => {
        const fs = await import("fs");
        expect(fs.existsSync(join(import.meta.dir, "Contact.astro"))).toBe(true);
    });
});
