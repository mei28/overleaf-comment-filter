import type { SortPreset } from "../model/sort-presets";

// What a tab sorter reports to the header button and menu.
export type SorterStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export type TabSorter = {
  // Called whenever the page changes; cheap when nothing needs doing.
  sync(): void;
  setPreset(preset: SortPreset): void;
};

// The header shows one state for both tabs: a failure wins, then loading.
export function combineStatuses(statuses: SorterStatus[]): SorterStatus {
  return (
    statuses.find((status) => status.kind === "error") ??
    statuses.find((status) => status.kind === "loading") ?? { kind: "idle" }
  );
}
