// Every assumption about Overleaf's markup lives here, so a change in
// Overleaf's UI is a one-file fix. Checked against overleaf.com on 2026-10-08.
export const SELECTORS = {
  // Review panel, Current file tab: one container whose entries Overleaf
  // positions absolutely next to their lines.
  currentFileRoot: "#review-panel-current-file",
  currentFileEntries: "#review-panel-current-file > div",
  // Tab bar (Current file / Overview) fixed at the bottom of the panel.
  reviewPanelFooter: ".review-panel-footer",
  // Review panel, Overview tab (unmounted while another tab is active).
  overviewRoot: "#review-panel-overview",
  overviewFileEntries: ".review-panel-overview-file-entries",
  reviewEntry: ".review-panel-entry",
  commentEntry: ".review-panel-entry-comment",
  // Review panel header (exists only while the Review rail panel is open).
  reviewHeaderActions: ".review-panel-header .rail-panel-header-actions",
} as const;

// Classes of the header's own icon buttons (the close button uses these).
export const HEADER_ICON_BUTTON_CLASSES = [
  "d-inline-grid",
  "rail-panel-header-button-subdued",
  "icon-button-small",
  "btn",
] as const;

export const MATERIAL_SYMBOL_CLASSES = ["material-symbols", "icon-small"];
