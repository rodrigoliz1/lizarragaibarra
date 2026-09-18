import { createHash, createHmac, randomBytes } from "node:crypto";

import { isPublicProduction } from "@/lib/environment";
import type {
  AllowedPrivateDocumentType,
  PrivateStorageProvider,
} from "@/lib/storage/types";

type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  serverSideEncryption?: string;
  kmsKeyId?: string;
  requestTimeoutMs?: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MIN_REQUEST_TIMEOUT_MS = 1_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;

function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Base64(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("base64");
}

function hmac(key: Uint8Array | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodeAws(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodePath(value: string) {
  return value.split("/").map(encodeAws).join("/");
}

function awsTimestamp(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function optionalValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function requestTimeout(value: number | string | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_REQUEST_TIMEOUT_MS;
  return Math.max(
    MIN_REQUEST_TIMEOUT_MS,
    Math.min(MAX_REQUEST_TIMEOUT_MS, Math.floor(parsed)),
  );
}

function normalizeHeaderValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function canonicalizeHeaders(headers: Record<string, string>) {
  const normalized = new Map<string, string>();
  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName || normalized.has(normalizedName)) {
      throw new Error("Los encabezados S3 no son válidos.");
    }
    normalized.set(normalizedName, normalizeHeaderValue(value));
  }
  const entries = [...normalized.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return {
    canonicalHeaders: `${entries
      .map(([name, value]) => `${name}:${value}`)
      .join("\n")}\n`,
    signedHeaders: entries.map(([name]) => name).join(";"),
    normalized: Object.fromEntries(entries),
  };
}

export class S3PrivateStorageProvider implements PrivateStorageProvider {
  readonly name = "s3" as const;
  private readonly endpoint: string;
  private readonly sessionToken?: string;
  private readonly serverSideEncryption: "AES256" | "aws:kms";
  private readonly kmsKeyId?: string;
  private readonly requestTimeoutMs: number;

  constructor(private readonly config: S3Config) {
    let endpoint: URL;
    try {
      endpoint = new URL(config.endpoint);
    } catch {
      throw new Error("El endpoint S3 no es una URL válida.");
    }
    if (!["http:", "https:"].includes(endpoint.protocol)) {
      throw new Error("El endpoint S3 debe usar HTTP o HTTPS.");
    }
    if (isPublicProduction() && endpoint.protocol !== "https:") {
      throw new Error("El endpoint S3 debe usar HTTPS en producción.");
    }
    if (
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    ) {
      throw new Error(
        "El endpoint S3 no debe incluir credenciales, query ni hash.",
      );
    }
    if (
      !config.bucket.trim() ||
      config.bucket.includes("/") ||
      /[\u0000-\u001f\u007f]/.test(config.bucket)
    ) {
      throw new Error("El bucket S3 no es válido.");
    }

    this.endpoint = endpoint.toString().replace(/\/$/, "");
    this.sessionToken =
      optionalValue(config.sessionToken) ||
      optionalValue(process.env.S3_SESSION_TOKEN) ||
      optionalValue(process.env.AWS_SESSION_TOKEN);
    const configuredEncryption =
      optionalValue(config.serverSideEncryption) ||
      optionalValue(process.env.S3_SERVER_SIDE_ENCRYPTION) ||
      "AES256";
    if (!(["AES256", "aws:kms"] as string[]).includes(configuredEncryption)) {
      throw new Error("El cifrado del almacenamiento S3 no es válido.");
    }
    this.serverSideEncryption = configuredEncryption as "AES256" | "aws:kms";
    this.kmsKeyId =
      optionalValue(config.kmsKeyId) ||
      optionalValue(process.env.S3_KMS_KEY_ID) ||
      optionalValue(process.env.S3_SSE_KMS_KEY_ID);
    if (this.serverSideEncryption === "aws:kms" && !this.kmsKeyId) {
      throw new Error("SSE-KMS requiere una clave KMS configurada.");
    }
    this.requestTimeoutMs = requestTimeout(
      config.requestTimeoutMs ??
        optionalValue(process.env.S3_REQUEST_TIMEOUT_MS),
    );
  }

  private assertValidKey(key: string) {
    if (!/^(?:quarantine\/)?[a-f0-9]{2}\/[a-f0-9]{32}$/.test(key)) {
      throw new Error("La clave del objeto S3 no es válida.");
    }
  }

  private objectUrl(key: string) {
    this.assertValidKey(key);
    return new URL(
      `${this.endpoint}/${encodePath(this.config.bucket)}/${encodePath(key)}`,
    );
  }

  private signingKey(dateStamp: string) {
    const dateKey = hmac(`AWS4${this.config.secretAccessKey}`, dateStamp);
    const regionKey = hmac(dateKey, this.config.region);
    const serviceKey = hmac(regionKey, "s3");
    return hmac(serviceKey, "aws4_request");
  }

  private async signedRequest(
    method: "GET" | "PUT" | "DELETE",
    key: string,
    body?: Uint8Array,
    extraHeaders: Record<string, string> = {},
  ) {
    const url = this.objectUrl(key);
    const now = new Date();
    const amzDate = awsTimestamp(now);
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256(body ?? new Uint8Array());
    const requestHeaders: Record<string, string> = {
      ...extraHeaders,
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (this.sessionToken) {
      requestHeaders["x-amz-security-token"] = this.sessionToken;
    }
    const { canonicalHeaders, signedHeaders, normalized } =
      canonicalizeHeaders(requestHeaders);
    const canonicalRequest = [
      method,
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256(canonicalRequest),
    ].join("\n");
    const signature = createHmac("sha256", this.signingKey(dateStamp))
      .update(stringToSign)
      .digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const sentHeaders = { ...normalized };
    delete sentHeaders.host;
    const signal = AbortSignal.timeout(this.requestTimeoutMs);
    try {
      return await fetch(url, {
        method,
        headers: { ...sentHeaders, authorization },
        body: body === undefined ? undefined : Buffer.from(body),
        cache: "no-store",
        signal,
      });
    } catch (error) {
      if (signal.aborted) {
        throw new Error("La operación S3 excedió el tiempo máximo permitido.", {
          cause: error,
        });
      }
      throw new Error("No fue posible completar la operación S3.", {
        cause: error,
      });
    }
  }

  async put(input: {
    bytes: Uint8Array;
    mimeType: AllowedPrivateDocumentType;
    quarantine?: boolean;
    checksumSha256?: string;
  }) {
    const checksumHex = sha256(input.bytes);
    if (
      input.checksumSha256 &&
      input.checksumSha256.toLowerCase() !== checksumHex
    ) {
      throw new Error("El checksum del objeto privado no coincide.");
    }
    const id = randomBytes(16).toString("hex");
    const key = `${input.quarantine ? "quarantine/" : ""}${id.slice(0, 2)}/${id}`;
    const checksum = sha256Base64(input.bytes);
    const encryptionHeaders: Record<string, string> = {
      ...(new URL(this.endpoint).hostname.endsWith(".r2.cloudflarestorage.com")
        ? {}
        : { "x-amz-server-side-encryption": this.serverSideEncryption }),
    };
    if (this.serverSideEncryption === "aws:kms") {
      encryptionHeaders["x-amz-server-side-encryption-aws-kms-key-id"] =
        this.kmsKeyId!;
    }
    const response = await this.signedRequest("PUT", key, input.bytes, {
      "cache-control": "private, no-store",
      "content-type": input.mimeType,
      "content-disposition": "attachment",
      "x-amz-checksum-sha256": checksum,
      ...encryptionHeaders,
    });
    if (!response.ok)
      throw new Error(`S3 rechazó la carga privada (${response.status}).`);
    return { key, size: input.bytes.byteLength, mimeType: input.mimeType };
  }

  async get(key: string) {
    const response = await this.signedRequest("GET", key);
    if (!response.ok)
      throw new Error(`S3 rechazó la descarga privada (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async delete(key: string) {
    const response = await this.signedRequest("DELETE", key);
    if (!response.ok && response.status !== 404) {
      throw new Error(
        `S3 rechazó la eliminación privada (${response.status}).`,
      );
    }
  }

  async createSignedDownloadUrl(
    key: string,
    filename: string,
    expiresInSeconds = 300,
  ) {
    if (key.startsWith("quarantine/")) {
      throw new Error("Los objetos en cuarentena no admiten descarga firmada.");
    }
    const url = this.objectUrl(key);
    const now = new Date();
    const amzDate = awsTimestamp(now);
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const expires = Math.max(60, Math.min(900, Math.floor(expiresInSeconds)));
    const queryEntries: Array<[string, string]> = [
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      ["X-Amz-Credential", `${this.config.accessKeyId}/${scope}`],
      ["X-Amz-Date", amzDate],
      ["X-Amz-Expires", expires.toString()],
      ["X-Amz-SignedHeaders", "host"],
      [
        "response-content-disposition",
        `attachment; filename="${filename.replace(/["\r\n]/g, "_")}"`,
      ],
      ["response-cache-control", "private, no-store"],
    ];
    if (this.sessionToken) {
      queryEntries.push(["X-Amz-Security-Token", this.sessionToken]);
    }
    const canonicalQuery = queryEntries
      .map(([name, value]) => [encodeAws(name), encodeAws(value)] as const)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `${name}=${value}`)
      .join("&");
    const canonicalRequest = [
      "GET",
      url.pathname,
      canonicalQuery,
      `host:${url.host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256(canonicalRequest),
    ].join("\n");
    const signature = createHmac("sha256", this.signingKey(dateStamp))
      .update(stringToSign)
      .digest("hex");
    url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
    return url.toString();
  }
}
