import type {
  GarminWorkoutJson,
  GarminWorkoutStep,
  GarminExecutableStep,
  GarminRepeatStep,
} from "./types";
import { RUNNING_SPORT, STEP_TYPE, END_CONDITION, TARGET_TYPE } from "./ids";
import type { WorkoutPlan, Step, IntervalStep, Target } from "../parser/types";
import type { ZoneConfig } from "../storage/types";
import { secondsPerKmToMps } from "../shared/format";
import { generateName } from "../parser/nameGenerator";

function findZone(zones: ZoneConfig, name: string) {
  const lower = name.toLowerCase();
  return zones.zones.find((z) => z.name.toLowerCase() === lower);
}

type TargetEncoding = {
  targetType: GarminExecutableStep["targetType"];
  targetValueOne?: number;
  targetValueTwo?: number;
  descriptionAddition?: string;
};

function encodeTarget(target: Target | undefined, zones: ZoneConfig): TargetEncoding {
  if (!target) return { targetType: TARGET_TYPE.no_target };

  if (target.kind === "pace_zone") {
    const zone = findZone(zones, target.zoneName);
    if (!zone) return { targetType: TARGET_TYPE.no_target, descriptionAddition: `@ ${target.zoneName}` };
    const slowMps = secondsPerKmToMps(zone.maxSecPerKm);
    const fastMps = secondsPerKmToMps(zone.minSecPerKm);
    return {
      targetType: TARGET_TYPE.pace_zone,
      targetValueOne: slowMps,
      targetValueTwo: fastMps,
    };
  }

  if (target.kind === "pace_range") {
    return {
      targetType: TARGET_TYPE.pace_zone,
      targetValueOne: secondsPerKmToMps(target.maxSecPerKm),
      targetValueTwo: secondsPerKmToMps(target.minSecPerKm),
    };
  }

  if (target.kind === "hr_range") {
    return {
      targetType: TARGET_TYPE.hr_zone,
      targetValueOne: target.minBpm,
      targetValueTwo: target.maxBpm,
    };
  }

  return { targetType: TARGET_TYPE.no_target, descriptionAddition: `RPE ${target.value}` };
}

function encodeDuration(step: IntervalStep): Pick<GarminExecutableStep, "endCondition" | "endConditionValue"> {
  if (step.duration.unit === "time") {
    return { endCondition: END_CONDITION.time, endConditionValue: step.duration.seconds };
  }
  if (step.duration.unit === "distance") {
    return { endCondition: END_CONDITION.distance, endConditionValue: step.duration.meters };
  }
  return { endCondition: END_CONDITION.lap_button };
}

function combineDescription(notes: string | undefined, addition: string | undefined): string | undefined {
  if (notes && addition) return `${notes} (${addition})`;
  return notes ?? addition;
}

type Counter = { value: number };

function encodeStep(step: Step, zones: ZoneConfig, counter: Counter): GarminWorkoutStep {
  counter.value += 1;
  const stepOrder = counter.value;

  if (step.kind === "interval") {
    const target = encodeTarget(step.target, zones);
    const duration = encodeDuration(step);
    const description = combineDescription(step.notes, target.descriptionAddition);
    const exec: GarminExecutableStep = {
      type: "ExecutableStepDTO",
      stepOrder,
      stepType: STEP_TYPE[step.intent],
      ...duration,
      targetType: target.targetType,
      ...(target.targetValueOne !== undefined ? { targetValueOne: target.targetValueOne } : {}),
      ...(target.targetValueTwo !== undefined ? { targetValueTwo: target.targetValueTwo } : {}),
      ...(description !== undefined ? { description } : {}),
    };
    return exec;
  }

  const repeat: GarminRepeatStep = {
    type: "RepeatGroupDTO",
    stepOrder,
    stepType: STEP_TYPE.repeat,
    numberOfIterations: step.count,
    endCondition: END_CONDITION.iterations,
    skipLastRestStep: true,
    workoutSteps: step.children.map((c) => encodeStep(c, zones, counter)),
  };
  return repeat;
}

export function translate(plan: WorkoutPlan, zones: ZoneConfig): GarminWorkoutJson {
  const name = plan.name ?? generateName(plan);
  const counter: Counter = { value: 0 };
  const workoutSteps = plan.steps.map((s) => encodeStep(s, zones, counter));
  return {
    workoutName: name,
    sportType: RUNNING_SPORT,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: RUNNING_SPORT,
        workoutSteps,
      },
    ],
  };
}
