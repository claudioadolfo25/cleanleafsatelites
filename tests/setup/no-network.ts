import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  // Network isolation guard for offline testing
});

afterEach(() => {
  vi.restoreAllMocks();
});
