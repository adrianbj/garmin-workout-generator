import { describe, it, expect } from "vitest";
import { translate } from "./translate";
import type { WorkoutPlan } from "../parser/types";
import type { ZoneConfig } from "../storage/types";

const zones: ZoneConfig = {
  unit: "min/km",
  zones: [
    { name: "aerobic threshold", minSecPerKm: 270, maxSecPerKm: 285 },
    { name: "easy", minSecPerKm: 315, maxSecPerKm: 345 },
  ],
};

describe("translate", () => {
  it("translates a single time-based work interval with a pace zone", () => {
    const plan: WorkoutPlan = {
      name: "Test",
      sport: "running",
      steps: [
        { kind: "interval", intent: "work", duration: { unit: "time", seconds: 720 },
          target: { kind: "pace_zone", zoneName: "aerobic threshold" } },
      ],
    };
    const out = translate(plan, zones);
    expect(out.workoutName).toBe("Test");
    expect(out.sportType.sportTypeKey).toBe("running");
    expect(out.workoutSegments).toHaveLength(1);
    const seg = out.workoutSegments[0];
    expect(seg).toBeDefined();
    if (!seg) return;
    expect(seg.workoutSteps).toHaveLength(1);
    const step = seg.workoutSteps[0];
    expect(step).toBeDefined();
    if (!step) return;
    expect(step.type).toBe("ExecutableStepDTO");
    if (step.type === "ExecutableStepDTO") {
      expect(step.stepType.stepTypeKey).toBe("interval");
      expect(step.endCondition.conditionTypeKey).toBe("time");
      expect(step.endConditionValue).toBe(720);
      expect(step.targetType.workoutTargetTypeKey).toBe("pace.zone");
      expect(step.targetValueOne).toBeCloseTo(3.509, 3);
      expect(step.targetValueTwo).toBeCloseTo(3.704, 3);
    }
  });

  it("translates a distance-based step", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [
        { kind: "interval", intent: "work", duration: { unit: "distance", meters: 1000 } },
      ],
    };
    const out = translate(plan, zones);
    const seg = out.workoutSegments[0];
    expect(seg).toBeDefined();
    if (!seg) return;
    const step = seg.workoutSteps[0];
    expect(step).toBeDefined();
    if (!step) return;
    if (step.type === "ExecutableStepDTO") {
      expect(step.endCondition.conditionTypeKey).toBe("distance");
      expect(step.endConditionValue).toBe(1000);
      expect(step.targetType.workoutTargetTypeKey).toBe("no.target");
    }
  });

  it("translates an open-ended step to lap.button", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "interval", intent: "warmup", duration: { unit: "open" } }],
    };
    const seg = translate(plan, zones).workoutSegments[0];
    expect(seg).toBeDefined();
    if (!seg) return;
    const step = seg.workoutSteps[0];
    expect(step).toBeDefined();
    if (!step) return;
    if (step.type === "ExecutableStepDTO") {
      expect(step.endCondition.conditionTypeKey).toBe("lap.button");
      expect(step.endConditionValue).toBeUndefined();
    }
  });

  it("wraps repeats in a RepeatGroupDTO with iterations end condition", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "repeat", count: 5, children: [
        { kind: "interval", intent: "work", duration: { unit: "distance", meters: 1000 } },
        { kind: "interval", intent: "rest", duration: { unit: "time", seconds: 120 } },
      ]}],
    };
    const out = translate(plan, zones);
    const seg = out.workoutSegments[0];
    expect(seg).toBeDefined();
    if (!seg) return;
    const repeat = seg.workoutSteps[0];
    expect(repeat).toBeDefined();
    if (!repeat) return;
    expect(repeat.type).toBe("RepeatGroupDTO");
    if (repeat.type === "RepeatGroupDTO") {
      expect(repeat.numberOfIterations).toBe(5);
      expect(repeat.endCondition.conditionTypeKey).toBe("iterations");
      expect(repeat.workoutSteps).toHaveLength(2);
      expect(repeat.skipLastRestStep).toBe(true);
    }
  });

  it("preserves notes in the description field", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "interval", intent: "rest",
        duration: { unit: "time", seconds: 60 }, notes: "jog" }],
    };
    const seg = translate(plan, zones).workoutSegments[0];
    expect(seg).toBeDefined();
    if (!seg) return;
    const step = seg.workoutSteps[0];
    expect(step).toBeDefined();
    if (!step) return;
    if (step.type === "ExecutableStepDTO") {
      expect(step.description).toBe("jog");
    }
  });

  it("encodes RPE in the description since Garmin has no native RPE target", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "interval", intent: "work",
        duration: { unit: "time", seconds: 60 }, target: { kind: "rpe", value: 8 } }],
    };
    const seg = translate(plan, zones).workoutSegments[0];
    expect(seg).toBeDefined();
    if (!seg) return;
    const step = seg.workoutSteps[0];
    expect(step).toBeDefined();
    if (!step) return;
    if (step.type === "ExecutableStepDTO") {
      expect(step.targetType.workoutTargetTypeKey).toBe("no.target");
      expect(step.description).toMatch(/RPE 8/);
    }
  });

  it("uses the auto-generated name when none provided", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [{ kind: "interval", intent: "work", duration: { unit: "time", seconds: 1800 },
        target: { kind: "pace_zone", zoneName: "easy" } }],
    };
    expect(translate(plan, zones).workoutName).toBe("30' easy");
  });

  it("assigns stepOrder sequentially across nested steps", () => {
    const plan: WorkoutPlan = {
      sport: "running",
      steps: [
        { kind: "interval", intent: "warmup", duration: { unit: "time", seconds: 300 } },
        { kind: "repeat", count: 2, children: [
          { kind: "interval", intent: "work", duration: { unit: "time", seconds: 60 } },
          { kind: "interval", intent: "rest", duration: { unit: "time", seconds: 30 } },
        ]},
        { kind: "interval", intent: "cooldown", duration: { unit: "time", seconds: 300 } },
      ],
    };
    const seg = translate(plan, zones).workoutSegments[0];
    expect(seg).toBeDefined();
    if (!seg) return;
    const steps = seg.workoutSteps;
    const s0 = steps[0];
    const s1 = steps[1];
    const s2 = steps[2];
    expect(s0).toBeDefined();
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
    if (!s0 || !s1 || !s2) return;
    expect(s0.stepOrder).toBe(1);
    expect(s1.stepOrder).toBe(2);
    if (s1.type === "RepeatGroupDTO") {
      const c0 = s1.workoutSteps[0];
      const c1 = s1.workoutSteps[1];
      expect(c0).toBeDefined();
      expect(c1).toBeDefined();
      if (!c0 || !c1) return;
      expect(c0.stepOrder).toBe(3);
      expect(c1.stepOrder).toBe(4);
    }
    expect(s2.stepOrder).toBe(5);
  });
});
