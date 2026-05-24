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

export const STORAGE_KEY = "gwg.zoneConfig.v1" as const;
