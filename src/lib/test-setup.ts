/**
 * Test setup for Vitest
 *
 * Note: Using node environment by default for unit tests.
 * React component tests should use @vitest-environment jsdom directive.
 */
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup DOM after each test when using jsdom
afterEach(() => {
  cleanup();
});
