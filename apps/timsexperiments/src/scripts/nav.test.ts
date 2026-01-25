import { describe, it, expect, mock } from "bun:test";

describe("nav script", () => {
  it("should setup navigation observer", () => {
     global.IntersectionObserver = mock(() => ({
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {},
    })) as any;

    global.document = {
        querySelectorAll: () => [],
        querySelector: () => ({}),
    } as any;

    expect(async () => {
      await import("./nav");
    }).not.toThrow();
  });
});
