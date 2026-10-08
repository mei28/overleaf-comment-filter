const pad = (value: number) => String(value).padStart(2, "0");

// 'YYYY-MM-DD HH:mm' in the browser's time zone.
export function formatDateTime(epochMs: number): string {
  const date = new Date(epochMs);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
