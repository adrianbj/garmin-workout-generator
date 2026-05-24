import type { ZoneConfig } from "./types";

export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
  unit: "min/km",
  zones: [
    { name: "recovery",           minSecPerKm: 360, maxSecPerKm: 420 },
    { name: "easy",               minSecPerKm: 315, maxSecPerKm: 345 },
    { name: "marathon",           minSecPerKm: 285, maxSecPerKm: 300 },
    { name: "aerobic threshold",  minSecPerKm: 270, maxSecPerKm: 285 },
    { name: "5k",                 minSecPerKm: 240, maxSecPerKm: 255 },
  ],
};
