import type { SortSetting } from "./sort-by-time";

export type TimePreset =
  | "latestReply"
  | "oldestReply"
  | "newestComment"
  | "oldestComment";

// "document" keeps Overleaf's own order; only the Overview tab offers it.
export type SortPreset = "document" | TimePreset;

const SETTINGS: Record<TimePreset, SortSetting> = {
  latestReply: { key: "lastActivity", order: "desc" },
  oldestReply: { key: "lastActivity", order: "asc" },
  newestComment: { key: "created", order: "desc" },
  oldestComment: { key: "created", order: "asc" },
};

export function presetSetting(preset: TimePreset): SortSetting {
  return SETTINGS[preset];
}

export const TIME_PRESETS: readonly TimePreset[] = [
  "latestReply",
  "oldestReply",
  "newestComment",
  "oldestComment",
];

export const PRESET_LABELS: Record<SortPreset, string> = {
  document: "Document order",
  latestReply: "Latest reply first",
  oldestReply: "Oldest reply first",
  newestComment: "Newest comment first",
  oldestComment: "Oldest comment first",
};

export function isTimePreset(value: string): value is TimePreset {
  return (TIME_PRESETS as readonly string[]).includes(value);
}
