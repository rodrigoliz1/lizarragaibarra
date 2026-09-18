const INTERNAL_ORIGIN = "https://lizarraga-ibarra.invalid";

export function safeInternalPath(
  value: string | string[] | undefined,
  fallback = "/portal",
) {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (
    value.startsWith("//") ||
    value.includes("\\") ||
    /%5c|%2f%2f|[\u0000-\u001f\u007f]/i.test(value)
  ) {
    return fallback;
  }
  try {
    const resolved = new URL(value, INTERNAL_ORIGIN);
    if (resolved.origin !== INTERNAL_ORIGIN) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
