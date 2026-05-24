import type { ZoneConfig, PaceZone } from "./types";
import { STORAGE_KEY } from "./types";
import { DEFAULT_ZONE_CONFIG } from "./defaults";

function isValidZone(z: unknown): z is PaceZone {
  return (
    typeof z === "object" && z !== null &&
    typeof (z as PaceZone).name === "string" &&
    typeof (z as PaceZone).minSecPerKm === "number" &&
    typeof (z as PaceZone).maxSecPerKm === "number" &&
    (z as PaceZone).minSecPerKm > 0 &&
    (z as PaceZone).maxSecPerKm >= (z as PaceZone).minSecPerKm
  );
}

function isValidConfig(c: unknown): c is ZoneConfig {
  if (typeof c !== "object" || c === null) return false;
  const cc = c as Partial<ZoneConfig>;
  if (cc.unit !== "min/km" && cc.unit !== "min/mi") return false;
  if (!Array.isArray(cc.zones)) return false;
  return cc.zones.every(isValidZone);
}

export async function getZoneConfig(): Promise<ZoneConfig> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY];
  if (isValidConfig(raw)) return raw;
  return DEFAULT_ZONE_CONFIG;
}

export async function setZoneConfig(config: ZoneConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config });
}
