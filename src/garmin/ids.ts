import type { GarminSportType, GarminStepType, GarminEndCondition, GarminTargetType } from "./types";

export const RUNNING_SPORT: GarminSportType = { sportTypeId: 1, sportTypeKey: "running" };

export const STEP_TYPE: Record<"warmup" | "cooldown" | "work" | "rest" | "recovery" | "repeat", GarminStepType> = {
  warmup:   { stepTypeId: 1, stepTypeKey: "warmup" },
  cooldown: { stepTypeId: 2, stepTypeKey: "cooldown" },
  work:     { stepTypeId: 3, stepTypeKey: "interval" },
  rest:     { stepTypeId: 5, stepTypeKey: "rest" },
  recovery: { stepTypeId: 4, stepTypeKey: "recovery" },
  repeat:   { stepTypeId: 6, stepTypeKey: "repeat" },
};

export const END_CONDITION: Record<"lap_button" | "time" | "distance" | "iterations", GarminEndCondition> = {
  lap_button: { conditionTypeId: 1, conditionTypeKey: "lap.button" },
  time:       { conditionTypeId: 2, conditionTypeKey: "time" },
  distance:   { conditionTypeId: 3, conditionTypeKey: "distance" },
  iterations: { conditionTypeId: 7, conditionTypeKey: "iterations" },
};

export const TARGET_TYPE: Record<"no_target" | "pace_zone" | "hr_zone", GarminTargetType> = {
  no_target: { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target" },
  pace_zone: { workoutTargetTypeId: 6, workoutTargetTypeKey: "pace.zone" },
  hr_zone:   { workoutTargetTypeId: 4, workoutTargetTypeKey: "heart.rate.zone" },
};
