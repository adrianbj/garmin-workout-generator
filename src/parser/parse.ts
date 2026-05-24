import type { WorkoutPlan, ParseError } from "./types";
import type { ZoneConfig } from "../storage/types";
import { ok, err, type Result } from "../shared/result";
import { workoutPlanSchema, workoutPlanJsonSchema } from "./schema";
import { buildSystemPrompt } from "./prompt";
import { validate } from "./validate";
import { generateName } from "./nameGenerator";

export type ParseFailureCode = "NOT_AVAILABLE" | "MALFORMED" | "PROMPT_FAILED";

export type ParseFailure = {
  code: ParseFailureCode;
  message: string;
  cause?: unknown;
};

export type ParseSuccess = {
  plan: WorkoutPlan;
  errors: ParseError[];
};

type CachedSession = { key: string; session: LanguageModelSession };
let cached: CachedSession | undefined;

type LanguageModelSession = {
  prompt: (input: string, opts?: { responseConstraint?: unknown }) => Promise<string>;
  destroy: () => void;
};

type LanguageModelGlobal = {
  availability: () => Promise<"no" | "readily" | "after-download" | "downloadable">;
  create: (opts: { systemPrompt: string }) => Promise<LanguageModelSession>;
};

function getLM(): LanguageModelGlobal | undefined {
  return (globalThis as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
}

async function getSession(zones: ZoneConfig): Promise<Result<LanguageModelSession, ParseFailure>> {
  const lm = getLM();
  if (!lm) return err({ code: "NOT_AVAILABLE", message: "Prompt API not available in this browser." });
  const availability = await lm.availability();
  if (availability === "no") return err({ code: "NOT_AVAILABLE", message: "Gemini Nano is not available on this device." });
  const key = JSON.stringify(zones);
  if (cached && cached.key === key) return ok(cached.session);
  if (cached) cached.session.destroy();
  const session = await lm.create({ systemPrompt: buildSystemPrompt(zones) });
  cached = { key, session };
  return ok(session);
}

export async function parse(
  text: string,
  zones: ZoneConfig,
): Promise<Result<ParseSuccess, ParseFailure>> {
  const sessionResult = await getSession(zones);
  if (!sessionResult.ok) return sessionResult;
  const session = sessionResult.value;

  let raw: string;
  try {
    raw = await session.prompt(text, { responseConstraint: workoutPlanJsonSchema });
  } catch (cause) {
    return err({ code: "PROMPT_FAILED", message: "The on-device model failed to respond.", cause });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    return err({ code: "MALFORMED", message: "Model output was not valid JSON.", cause });
  }

  const schemaResult = workoutPlanSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return err({ code: "MALFORMED", message: "Model output didn't match the workout schema.", cause: schemaResult.error });
  }

  const validated = schemaResult.data as unknown as WorkoutPlan;
  const name = validated.name ?? generateName(validated);
  const plan: WorkoutPlan = { ...validated, name };

  const errors = validate(plan, zones);
  return ok({ plan, errors });
}

/** Test-only helper to clear the cached session. */
export function _resetSessionCache(): void {
  if (cached) cached.session.destroy();
  cached = undefined;
}
