type Environment = Record<string, string | undefined>;

const MEBIBYTE = 1024 * 1024;

function boundedInteger(
  environment: Environment,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number(environment[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

export function getDocumentMaxUploadBytes(
  environment: Environment = process.env,
) {
  return boundedInteger(
    environment,
    "DOCUMENT_MAX_UPLOAD_BYTES",
    10 * MEBIBYTE,
    1024,
    50 * MEBIBYTE,
  );
}

export function getDocumentUploadRateLimit(
  environment: Environment = process.env,
) {
  return {
    limit: boundedInteger(
      environment,
      "DOCUMENT_UPLOAD_RATE_LIMIT_MAX",
      10,
      1,
      1_000,
    ),
    windowMs: boundedInteger(
      environment,
      "DOCUMENT_UPLOAD_RATE_LIMIT_WINDOW_MS",
      60_000,
      1_000,
      24 * 60 * 60 * 1_000,
    ),
  };
}

export function getDocumentDownloadRateLimit(
  environment: Environment = process.env,
) {
  return {
    limit: boundedInteger(
      environment,
      "DOCUMENT_DOWNLOAD_RATE_LIMIT_MAX",
      120,
      1,
      10_000,
    ),
    windowMs: boundedInteger(
      environment,
      "DOCUMENT_DOWNLOAD_RATE_LIMIT_WINDOW_MS",
      60_000,
      1_000,
      24 * 60 * 60 * 1_000,
    ),
  };
}

export function getDocumentDownloadTtlSeconds(
  environment: Environment = process.env,
) {
  return boundedInteger(
    environment,
    "DOCUMENT_DOWNLOAD_URL_TTL_SECONDS",
    300,
    60,
    900,
  );
}

export function getDocumentScanTimeoutMs(
  environment: Environment = process.env,
) {
  return boundedInteger(
    environment,
    "FILE_SCAN_TIMEOUT_MS",
    15_000,
    1_000,
    60_000,
  );
}

export function getDocumentScanLockTimeoutMs(
  environment: Environment = process.env,
) {
  return boundedInteger(
    environment,
    "FILE_SCAN_LOCK_TIMEOUT_MS",
    5 * 60_000,
    30_000,
    60 * 60_000,
  );
}

export function getDocumentScanBatchSize(
  environment: Environment = process.env,
) {
  return boundedInteger(environment, "FILE_SCAN_BATCH_SIZE", 10, 1, 50);
}
