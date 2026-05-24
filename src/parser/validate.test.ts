import { describe, it, expect } from "vitest";
import { validate } from "./validate";
import type { WorkoutPlan } from "./types";
import type { ZoneConfig } from "../storage/types";

const zones: ZoneConfig = {
  unit: "min/km",
  zones: [
    { name: "easy", minSecPerKm: 315, maxSecPerKm: 345 },
    { name: "aerobic threshold", minSecPerKm: 270, maxSecPerKm: 285 },
  ],
};

const valid: WorkoutPlan = {
  sport: "running",
  steps: [
    { kind: "interval", intent: "work", duration: { unit: "time", seconds: 720 },
      target: { kind: "pace_zone", zoneName: "aerobic threshold" } },
  ],
};

describe("validate", () => {
  it("accepts a valid plan", () => {
    expect(validate(valid, zones)).toEqual([]);
  });

  it("errors when a pace_zone references an unknown name", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [
        { kind: "interval", intent: "work", duration: { unit: "time", seconds: 60 },
          target: { kind: "pace_zone", zoneName: "lactate threshold" } },
      ],
    };
    const errors = validate(plan, zones);
    expect(errors).toHaveLength(1);
    const [e0] = errors;
    expect(e0?.severity).toBe("error");
    expect(e0?.message).toMatch(/lactate threshold/);
  });

  it("suggests a close match for misspellings", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [
        { kind: "interval", intent: "work", duration: { unit: "time", seconds: 60 },
          target: { kind: "pace_zone", zoneName: "aerobic threshhold" } },
      ],
    };
    const errors = validate(plan, zones);
    const [e0] = errors;
    expect(e0?.suggestion).toBe("aerobic threshold");
  });

  it("matches zone names case-insensitively without error", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [
        { kind: "interval", intent: "work", duration: { unit: "time", seconds: 60 },
          target: { kind: "pace_zone", zoneName: "EASY" } },
      ],
    };
    expect(validate(plan, zones)).toEqual([]);
  });

  it("errors on empty step list", () => {
    const plan: WorkoutPlan = { sport: "running", steps: [] };
    const errors = validate(plan, zones);
    expect(errors).toHaveLength(1);
    const [e0] = errors;
    expect(e0?.message).toMatch(/no steps/i);
  });

  it("errors on a repeat with count < 1", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "repeat", count: 0, children: [
        { kind: "interval", intent: "work", duration: { unit: "time", seconds: 60 } },
      ] }],
    };
    expect(validate(plan, zones).some(e => /repeat count/i.test(e.message))).toBe(true);
  });

  it("warns when total duration exceeds 8 hours", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "interval", intent: "work", duration: { unit: "time", seconds: 9 * 3600 } }],
    };
    const errors = validate(plan, zones);
    expect(errors).toHaveLength(1);
    const [e0] = errors;
    expect(e0?.severity).toBe("warning");
  });

  it("recurses into repeats to validate inner pace zones", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "repeat", count: 3, children: [
        { kind: "interval", intent: "work", duration: { unit: "time", seconds: 60 },
          target: { kind: "pace_zone", zoneName: "nonsense" } },
      ] }],
    };
    expect(validate(plan, zones).some(e => /nonsense/.test(e.message))).toBe(true);
  });
});
