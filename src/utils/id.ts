export function createStableId(prefix: string): string {
  let uniquePart = "";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    uniquePart = crypto.randomUUID();
  } else {
    uniquePart = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }
  return prefix ? `${prefix}-${uniquePart}` : uniquePart;
}
