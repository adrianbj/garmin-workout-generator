import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const durationSchema = z.discriminatedUnion("unit", [
  z.object({ unit: z.literal("time"), seconds: z.number().positive() }),
  z.object({ unit: z.literal("distance"), meters: z.number().positive() }),
  z.object({ unit: z.literal("open") }),
]);

const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pace_zone"), zoneName: z.string().min(1) }),
  z.object({
    kind: z.literal("pace_range"),
    minSecPerKm: z.number().positive(),
    maxSecPerKm: z.number().positive(),
  }),
  z.object({
    kind: z.literal("hr_range"),
    minBpm: z.number().positive(),
    maxBpm: z.number().positive(),
  }),
  z.object({ kind: z.literal("rpe"), value: z.number().min(1).max(10) }),
]);

const intervalStepSchema = z.object({
  kind: z.literal("interval"),
  intent: z.enum(["warmup", "work", "rest", "recovery", "cooldown"]),
  duration: durationSchema,
  target: targetSchema.optional(),
  notes: z.string().optional(),
});

type StepIn = z.infer<typeof intervalStepSchema> | { kind: "repeat"; count: number; children: StepIn[] };

const stepSchema: z.ZodType<StepIn> = z.lazy(() =>
  z.union([
    intervalStepSchema,
    z.object({
      kind: z.literal("repeat"),
      count: z.number().int().positive(),
      children: z.array(stepSchema).min(1),
    }),
  ]),
);

export const workoutPlanSchema = z.object({
  name: z.string().optional(),
  sport: z.literal("running"),
  steps: z.array(stepSchema).min(1),
});

export type WorkoutPlanParsed = z.infer<typeof workoutPlanSchema>;

export const workoutPlanJsonSchema = zodToJsonSchema(workoutPlanSchema, {
  name: "WorkoutPlan",
  $refStrategy: "none",
});
