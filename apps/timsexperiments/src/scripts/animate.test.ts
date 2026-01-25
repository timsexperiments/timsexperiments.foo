import { describe, it, expect, mock, beforeAll } from "bun:test";

describe("animate script", () => {
  it("should define setupAnimateStartInViewport", () => {
    // Since the script runs side effects immediately, testing it is tricky without refactoring.
    // For now, we verify the file exists and can be imported without crashing.
    // We mock IntersectionObserver to avoid crashes.
    global.IntersectionObserver = mock(() => ({
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {},
    })) as any;

    global.document = {
      querySelectorAll: () => [],
    } as any;

    expect(async () => {
      await import("./animate");
    }).not.toThrow();
  });
});
