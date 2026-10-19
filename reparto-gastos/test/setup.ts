import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `server-only` lanza fuera del bundler de Next: en tests es un no-op.
vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
  // El bus de eventos vive en globalThis: se vacía entre tests.
  (globalThis as { _groupEventBus?: Map<string, unknown> })._groupEventBus?.clear();
});
