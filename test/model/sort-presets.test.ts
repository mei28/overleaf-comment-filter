import { describe, expect, it } from "vitest";
import { isTimePreset, presetSetting } from "../../src/model/sort-presets";

describe("presetSetting", () => {
  it.each([
    ["latestReply", { key: "lastActivity", order: "desc" }],
    ["oldestReply", { key: "lastActivity", order: "asc" }],
    ["newestComment", { key: "created", order: "desc" }],
    ["oldestComment", { key: "created", order: "asc" }],
  ] as const)("maps %s to a time sort", (preset, setting) => {
    expect(presetSetting(preset)).toEqual(setting);
  });
});

describe("isTimePreset", () => {
  it.each([
    ["latestReply", true],
    ["oldestComment", true],
    ["document", false],
    ["lastActivity", false],
  ])("%s -> %s", (value, expected) => {
    expect(isTimePreset(value)).toBe(expected);
  });
});
