export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  )
    return;
  if (!process.env.VERCEL_ENV && process.env.NODE_ENV !== "production") return;
  const { assertRuntimeConfiguration } =
    await import("@/lib/runtime-configuration");
  assertRuntimeConfiguration();
}
