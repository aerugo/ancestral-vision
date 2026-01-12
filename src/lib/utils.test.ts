import { describe, it, expect } from "vitest";
import { computeDisplayName, generateToken } from "./utils";

describe("computeDisplayName", () => {
  it("formats Western names correctly", () => {
    const result = computeDisplayName({
      givenName: "John",
      surname: "Smith",
      nameOrder: "WESTERN",
    });
    expect(result).toBe("John Smith");
  });

  it("formats Eastern names correctly", () => {
    const result = computeDisplayName({
      givenName: "明",
      surname: "王",
      nameOrder: "EASTERN",
    });
    expect(result).toBe("王明");
  });

  it("formats Icelandic patronymic names correctly", () => {
    const result = computeDisplayName({
      givenName: "Jón",
      patronymic: "Jónsson",
      nameOrder: "PATRONYMIC",
    });
    expect(result).toBe("Jón Jónsson");
  });

  it("formats Russian names with patronymic suffix correctly", () => {
    const result = computeDisplayName({
      givenName: "Ivan",
      patronymic: "Ivanovich",
      surname: "Petrov",
      nameOrder: "PATRONYMIC_SUFFIX",
    });
    expect(result).toBe("Ivan Ivanovich Petrov");
  });

  it("handles missing surname in Western format", () => {
    const result = computeDisplayName({
      givenName: "John",
      nameOrder: "WESTERN",
    });
    expect(result).toBe("John");
  });
});

describe("generateToken", () => {
  it("generates token of specified length", () => {
    const token = generateToken(16);
    expect(token.length).toBe(16);
  });

  it("generates token with default length of 32", () => {
    const token = generateToken();
    expect(token.length).toBe(32);
  });

  it("generates alphanumeric characters only", () => {
    const token = generateToken(100);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(100);
  });
});
