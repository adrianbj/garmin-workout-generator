import { describe, it, expect } from "vitest";
import { getZoneConfig, setZoneConfig } from "./storage";
import { DEFAULT_ZONE_CONFIG } from "./defaults";

describe("storage", () => {
  it("returns defaults on first read", async () => {
    const config = await getZoneConfig();
    expect(config).toEqual(DEFAULT_ZONE_CONFIG);
  });

  it("round-trips a written config", async () => {
    const custom = {
      unit: "min/mi" as const,
      zones: [{ name: "tempo", minSecPerKm: 250, maxSecPerKm: 260 }],
    };
    await setZoneConfig(custom);
    expect(await getZoneConfig()).toEqual(custom);
  });

  it("falls back to defaults if stored value is malformed", async () => {
    await chrome.storage.sync.set({ "gwg.zoneConfig.v1": { junk: true } });
    expect(await getZoneConfig()).toEqual(DEFAULT_ZONE_CONFIG);
  });
});
