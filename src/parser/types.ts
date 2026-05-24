export type WorkoutPlan = {
  name?: string;
  sport: "running";
  steps: Step[];
};

export type Step = IntervalStep | RepeatBlock;

export type IntervalStep = {
  kind: "interval";
  intent: "warmup" | "work" | "rest" | "recovery" | "cooldown";
  duration: Duration;
  target?: Target;
  notes?: string;
};

export type RepeatBlock = {
  kind: "repeat";
  count: number;
  children: Step[];
};

export type Duration =
  | { unit: "time"; seconds: number }
  | { unit: "distance"; meters: number }
  | { unit: "open" };

export type Target =
  | { kind: "pace_zone"; zoneName: string }
  | { kind: "pace_range"; minSecPerKm: number; maxSecPerKm: number }
  | { kind: "hr_range"; minBpm: number; maxBpm: number }
  | { kind: "rpe"; value: number };

export type ParseError = {
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
};
