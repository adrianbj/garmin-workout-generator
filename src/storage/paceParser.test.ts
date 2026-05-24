import { describe, it, expect } from "vitest";
import { parsePaceField } from "./paceParser";

describe("parsePaceField", () => {
  it("parses valid m:ss", () => {
    const r = parsePaceField("4:45");
    expect(r).toEqual({ ok: true, value: 285 });
  });

  it("rejects empty string with a friendly error", () => {
    const r = parsePaceField("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/pace required/i);
  });

  it("rejects 4:60 with a friendly error", () => {
    const r = parsePaceField("4:60");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/format/i);
  });

  it("trims surrounding whitespace", () => {
    expect(parsePaceField("  4:45  ")).toEqual({ ok: true, value: 285 });
  });
});
