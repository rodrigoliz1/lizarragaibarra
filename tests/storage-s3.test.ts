import { createHash, createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { S3PrivateStorageProvider } from "@/lib/storage/s3";

const baseConfig = {
  endpoint: "https://storage.example.com",
  region: "us-east-1",
  bucket: "xs-private",
  accessKeyId: "ACCESS_TEST",
  secretAccessKey: "SECRET_TEST",
};
const validKey = "ab/abcdefabcdefabcdefabcdefabcdefab";

function signingKey(secret: string, date: string, region: string) {
  const hmac = (key: Uint8Array | string, value: string) =>
    createHmac("sha256", key).update(value).digest();
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function verifyRequestSignature(input: URL, init: RequestInit) {
  const headers = new Headers(init.headers);
  const authorization = headers.get("authorization") ?? "";
  const credential = authorization.match(/Credential=([^,]+)/)?.[1];
  const signedHeaders = authorization.match(/SignedHeaders=([^,]+)/)?.[1];
  const actualSignature = authorization.match(/Signature=([a-f0-9]{64})/)?.[1];
  expect(credential).toBeTruthy();
  expect(signedHeaders).toBeTruthy();
  expect(actualSignature).toBeTruthy();

  const headerNames = signedHeaders!.split(";");
  const canonicalHeaders = `${headerNames
    .map((name) => {
      const value = name === "host" ? input.host : headers.get(name);
      expect(value, `encabezado firmado ausente: ${name}`).toBeTruthy();
      return `${name}:${value!.trim().replace(/\s+/g, " ")}`;
    })
    .join("\n")}\n`;
  const payloadHash = headers.get("x-amz-content-sha256")!;
  const canonicalRequest = [
    init.method,
    input.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const amzDate = headers.get("x-amz-date")!;
  const scope = credential!.slice(credential!.indexOf("/") + 1);
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const expectedSignature = createHmac(
    "sha256",
    signingKey("SECRET_TEST", amzDate.slice(0, 8), "us-east-1"),
  )
    .update(stringToSign)
    .digest("hex");
  expect(actualSignature).toBe(expectedSignature);
}

describe("almacenamiento S3 compatible", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T18:30:00.000Z"));
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("S3_SESSION_TOKEN", "");
    vi.stubEnv("AWS_SESSION_TOKEN", "");
    vi.stubEnv("S3_SERVER_SIDE_ENCRYPTION", "");
    vi.stubEnv("S3_KMS_KEY_ID", "");
    vi.stubEnv("S3_SSE_KMS_KEY_ID", "");
    vi.stubEnv("S3_REQUEST_TIMEOUT_MS", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("genera una URL GET firmada de corta duración sin exponer la clave secreta", async () => {
    const storage = new S3PrivateStorageProvider(baseConfig);
    const signed = await storage.createSignedDownloadUrl(
      validKey,
      "informe demo.pdf",
      300,
    );
    const url = new URL(signed);
    expect(url.pathname).toBe(`/xs-private/${validKey}`);
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
    expect(url.searchParams.get("response-cache-control")).toBe(
      "private, no-store",
    );
    expect(signed).not.toContain("SECRET_TEST");
  });

  it("firma checksum, cifrado, caché y disposición al cargar en cuarentena", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const storage = new S3PrivateStorageProvider({
      ...baseConfig,
      requestTimeoutMs: 500,
    });
    const bytes = new TextEncoder().encode("documento privado");

    const stored = await storage.put({
      bytes,
      mimeType: "application/pdf",
      quarantine: true,
    });

    expect(stored.key).toMatch(/^quarantine\/[a-f0-9]{2}\/[a-f0-9]{32}$/);
    expect(timeoutSpy).toHaveBeenCalledWith(1_000);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestInput, init] = fetchMock.mock.calls[0]!;
    const url = new URL(requestInput.toString());
    const headers = new Headers(init!.headers);
    expect(url.pathname).toBe(`/xs-private/${stored.key}`);
    expect(init!.method).toBe("PUT");
    expect(headers.get("cache-control")).toBe("private, no-store");
    expect(headers.get("content-disposition")).toBe("attachment");
    expect(headers.get("content-type")).toBe("application/pdf");
    expect(headers.get("x-amz-checksum-sha256")).toBe(
      createHash("sha256").update(bytes).digest("base64"),
    );
    expect(headers.get("x-amz-server-side-encryption")).toBe("AES256");
    expect(headers.get("authorization")).toContain(
      "SignedHeaders=cache-control;content-disposition;content-type;host;x-amz-checksum-sha256;x-amz-content-sha256;x-amz-date;x-amz-server-side-encryption",
    );
    verifyRequestSignature(url, init!);
  });

  it("usa SSE-KMS y credenciales temporales configuradas por entorno", async () => {
    vi.stubEnv("S3_SESSION_TOKEN", "SESSION_TOKEN_TEST");
    vi.stubEnv("S3_SERVER_SIDE_ENCRYPTION", "aws:kms");
    vi.stubEnv("S3_KMS_KEY_ID", "alias/xs-documents");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const storage = new S3PrivateStorageProvider(baseConfig);

    await storage.put({
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      mimeType: "application/pdf",
    });

    const [requestInput, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init!.headers);
    expect(headers.get("x-amz-server-side-encryption")).toBe("aws:kms");
    expect(headers.get("x-amz-server-side-encryption-aws-kms-key-id")).toBe(
      "alias/xs-documents",
    );
    expect(headers.get("x-amz-security-token")).toBe("SESSION_TOKEN_TEST");
    expect(headers.get("authorization")).toContain(
      "x-amz-security-token;x-amz-server-side-encryption;x-amz-server-side-encryption-aws-kms-key-id",
    );
    verifyRequestSignature(new URL(requestInput.toString()), init!);

    const signed = new URL(
      await storage.createSignedDownloadUrl(validKey, "informe.pdf"),
    );
    expect(signed.searchParams.get("X-Amz-Security-Token")).toBe(
      "SESSION_TOKEN_TEST",
    );
  });

  it("rechaza HTTP en producción pública y lo permite en preview", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(
      () =>
        new S3PrivateStorageProvider({
          ...baseConfig,
          endpoint: "http://storage.internal",
        }),
    ).toThrow("HTTPS en producción");

    vi.stubEnv("VERCEL_ENV", "preview");
    expect(
      () =>
        new S3PrivateStorageProvider({
          ...baseConfig,
          endpoint: "http://storage.internal",
        }),
    ).not.toThrow();
  });

  it("rechaza claves manipuladas antes de enviar una operación", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const storage = new S3PrivateStorageProvider(baseConfig);

    await expect(storage.get("../secreto")).rejects.toThrow(
      "clave del objeto S3 no es válida",
    );
    await expect(
      storage.createSignedDownloadUrl("/ruta/absoluta", "archivo.pdf"),
    ).rejects.toThrow("clave del objeto S3 no es válida");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("nunca firma una descarga mientras el objeto sigue en cuarentena", async () => {
    const storage = new S3PrivateStorageProvider(baseConfig);
    await expect(
      storage.createSignedDownloadUrl(
        "quarantine/ab/abcdefabcdefabcdefabcdefabcdefab",
        "archivo.pdf",
      ),
    ).rejects.toThrow("cuarentena");
  });

  it("rechaza un checksum declarado que no corresponde a los bytes", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const storage = new S3PrivateStorageProvider(baseConfig);

    await expect(
      storage.put({
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "application/pdf",
        checksumSha256: "0".repeat(64),
      }),
    ).rejects.toThrow("checksum del objeto privado no coincide");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
