import type { WorkoutPlan, Step, ParseError, IntervalStep } from "./types";
import type { ZoneConfig } from "../storage/types";

const MAX_WORKOUT_SECONDS = 8 * 3600;

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j] ?? 0;
      row[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, row[j] ?? 0, row[j - 1] ?? 0);
      prev = tmp;
    }
  }
  return row[n] ?? 0;
}

function closestZoneName(input: string, zoneNames: string[]): string | undefined {
  let best: { name: string; distance: number } | undefined;
  for (const name of zoneNames) {
    const d = levenshtein(input.toLowerCase(), name.toLowerCase());
    if (!best || d < best.distance) best = { name, distance: d };
  }
  if (best && best.distance <= 3 && best.distance > 0) return best.name;
  return undefined;
}

function estimateDurationSeconds(step: Step): number {
  if (step.kind === "interval") {
    if (step.duration.unit === "time") return step.duration.seconds;
    if (step.duration.unit === "distance") return step.duration.meters / 3;
    return 0;
  }
  const inner = step.children.reduce((sum, c) => sum + estimateDurationSeconds(c), 0);
  return inner * step.count;
}

function walkIntervals(steps: Step[], visit: (s: IntervalStep) => void): void {
  for (const s of steps) {
    if (s.kind === "interval") visit(s);
    else walkIntervals(s.children, visit);
  }
}

function walkRepeats(steps: Step[], visit: (count: number) => void): void {
  for (const s of steps) {
    if (s.kind === "repeat") {
      visit(s.count);
      walkRepeats(s.children, visit);
    }
  }
}

export function validate(plan: WorkoutPlan, zones: ZoneConfig): ParseError[] {
  const errors: ParseError[] = [];

  if (plan.steps.length === 0) {
    errors.push({ severity: "error", message: "Plan has no steps." });
    return errors;
  }

  const zoneNames = zones.zones.map((z) => z.name);
  const zoneNamesLower = new Set(zoneNames.map((n) => n.toLowerCase()));

  walkIntervals(plan.steps, (s) => {
    if (s.target?.kind === "pace_zone") {
      const lower = s.target.zoneName.toLowerCase();
      if (!zoneNamesLower.has(lower)) {
        const suggestion = closestZoneName(s.target.zoneName, zoneNames);
        errors.push({
          severity: "error",
          message: `Pace zone "${s.target.zoneName}" is not configured.`,
          ...(suggestion ? { suggestion } : {}),
        });
      }
    }
    if (s.duration.unit === "time" && s.duration.seconds <= 0) {
      errors.push({ severity: "error", message: "Step duration must be positive." });
    }
    if (s.duration.unit === "distance" && s.duration.meters <= 0) {
      errors.push({ severity: "error", message: "Step distance must be positive." });
    }
  });

  walkRepeats(plan.steps, (count) => {
    if (count < 1) {
      errors.push({ severity: "error", message: `Repeat count must be ≥ 1 (got ${count}).` });
    }
  });

  const totalSec = plan.steps.reduce((sum, s) => sum + estimateDurationSeconds(s), 0);
  if (totalSec > MAX_WORKOUT_SECONDS) {
    errors.push({
      severity: "warning",
      message: `Total workout duration is ~${Math.round(totalSec / 60)} min — unusually long.`,
    });
  }

  return errors;
}
