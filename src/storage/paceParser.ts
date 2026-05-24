import { ok, err, type Result } from "../shared/result";
import { parsePaceString } from "../shared/format";

export function parsePaceField(input: string): Result<number, string> {
  const trimmed = input.trim();
  if (trimmed === "") return err("Pace required (e.g. 4:45)");
  const seconds = parsePaceString(trimmed);
  if (seconds === null) return err("Bad format — use m:ss (e.g. 4:45)");
  return ok(seconds);
}
