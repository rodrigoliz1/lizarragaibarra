export type RuntimeEnvironment = Record<string, string | undefined>;

function value(environment: RuntimeEnvironment, key: string) {
  const candidate = environment[key]?.trim();
  return candidate || undefined;
}

function normalizeSiteUrl(candidate: string) {
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("La URL pública debe utilizar HTTP o HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("La URL pública no puede contener credenciales.");
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isLocal && url.protocol !== "https:") url.protocol = "https:";
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

export function getSiteUrl(environment: RuntimeEnvironment = process.env) {
  const explicit =
    value(environment, "NEXT_PUBLIC_SITE_URL") ||
    value(environment, "AUTH_URL") ||
    value(environment, "NEXTAUTH_URL");
  if (explicit) return normalizeSiteUrl(explicit);

  const vercelHost =
    (value(environment, "VERCEL_ENV") === "production"
      ? value(environment, "VERCEL_PROJECT_PRODUCTION_URL")
      : undefined) || value(environment, "VERCEL_URL");
  if (vercelHost) return normalizeSiteUrl(vercelHost);

  return "https://lizarragaibarra.com";
}
