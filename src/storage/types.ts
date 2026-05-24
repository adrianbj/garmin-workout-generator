export type PaceUnit = "min/km" | "min/mi";

export type PaceZone = {
  name: string;
  minSecPerKm: number;
  maxSecPerKm: number;
};

export type ZoneConfig = {
  zones: PaceZone[];
  unit: PaceUnit;
};

export type Settings = {
  geminiApiKey?: string;
};

export const STORAGE_KEY = "gwg.zoneConfig.v1" as const;
export const SETTINGS_KEY = "gwg.settings.v1" as const;
