import { describe, it, expect } from "vitest";
import { formatDuration, parsePaceString, secondsPerKmToMps, mpsToSecondsPerKm } from "./format";

describe("formatDuration", () => {
  it("formats seconds under a minute", () => {
    expect(formatDuration(45)).toBe("0:45");
  });
  it("formats m:ss", () => {
    expect(formatDuration(285)).toBe("4:45");
  });
  it("formats h:mm:ss when over one hour", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });
  it("returns 0:00 for zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
});

describe("parsePaceString", () => {
  it("parses m:ss", () => {
    expect(parsePaceString("4:45")).toBe(285);
  });
  it("parses with single-digit seconds", () => {
    expect(parsePaceString("4:5")).toBe(245);
  });
  it("returns null on invalid input", () => {
    expect(parsePaceString("xyz")).toBeNull();
    expect(parsePaceString("4:60")).toBeNull();
    expect(parsePaceString("")).toBeNull();
  });
});

describe("secondsPerKmToMps", () => {
  it("converts 4:00/km (240 s/km) to 4.167 m/s", () => {
    expect(secondsPerKmToMps(240)).toBeCloseTo(4.167, 3);
  });
});

describe("mpsToSecondsPerKm", () => {
  it("round-trips with secondsPerKmToMps", () => {
    expect(mpsToSecondsPerKm(secondsPerKmToMps(285))).toBeCloseTo(285, 0);
  });
});
