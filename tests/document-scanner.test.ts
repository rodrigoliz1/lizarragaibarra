import { createServer } from "node:net";

import { describe, expect, it } from "vitest";

import {
  ClamAvDocumentScanner,
  createClamAvInstreamPayload,
  DocumentScannerInputError,
  DocumentScannerUnavailableError,
  getDocumentScanner,
  parseClamAvResponse,
} from "@/lib/documents/scanner";

describe("scanner de documentos", () => {
  it("codifica el protocolo INSTREAM con chunks y terminador", () => {
    const bytes = Uint8Array.from(
      { length: 70_000 },
      (_, index) => index % 251,
    );
    const payload = createClamAvInstreamPayload(bytes, 100_000);
    let offset = Buffer.byteLength("zINSTREAM\0");
    expect(payload.subarray(0, offset).toString()).toBe("zINSTREAM\0");
    const chunks: Buffer[] = [];
    while (offset < payload.byteLength) {
      const length = payload.readUInt32BE(offset);
      offset += 4;
      if (length === 0) break;
      chunks.push(payload.subarray(offset, offset + length));
      offset += length;
    }
    expect(Buffer.concat(chunks)).toEqual(Buffer.from(bytes));
    expect(offset).toBe(payload.byteLength);
  });

  it("rechaza entradas vacías o mayores al límite antes de abrir el socket", () => {
    expect(() => createClamAvInstreamPayload(new Uint8Array(), 10)).toThrow(
      DocumentScannerInputError,
    );
    expect(() => createClamAvInstreamPayload(new Uint8Array(11), 10)).toThrow(
      DocumentScannerInputError,
    );
  });

  it("interpreta respuestas limpias e infectadas sin exponer texto arbitrario", () => {
    expect(parseClamAvResponse("stream: OK\0")).toEqual({ verdict: "clean" });
    expect(parseClamAvResponse("stream: Eicar Test/Signature FOUND\0")).toEqual(
      { verdict: "infected", threat: "Eicar_Test_Signature" },
    );
    expect(() => parseClamAvResponse("stream: daemon ERROR\0")).toThrow(
      DocumentScannerUnavailableError,
    );
  });

  it("sólo permite mock en local, test o Preview", () => {
    expect(
      getDocumentScanner({
        NODE_ENV: "development",
        FILE_SCANNER_PROVIDER: "mock",
      }).name,
    ).toBe("mock");
    expect(
      getDocumentScanner({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        FILE_SCANNER_PROVIDER: "mock",
      }).name,
    ).toBe("mock");
    expect(() =>
      getDocumentScanner({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        FILE_SCANNER_PROVIDER: "mock",
      }),
    ).toThrow("no está permitido en producción");
  });

  it("exige host y puerto válidos para ClamAV", () => {
    expect(() =>
      getDocumentScanner({
        NODE_ENV: "production",
        FILE_SCANNER_PROVIDER: "clamav",
      }),
    ).toThrow("configuración de ClamAV");
    expect(
      getDocumentScanner({
        NODE_ENV: "production",
        FILE_SCANNER_PROVIDER: "clamav",
        CLAMAV_HOST: "scanner.internal",
        CLAMAV_PORT: "3310",
      }).name,
    ).toBe("clamav");
  });

  it("envía INSTREAM por TCP y espera el veredicto del daemon", async () => {
    const received: Buffer[] = [];
    const server = createServer({ allowHalfOpen: true }, (socket) => {
      socket.on("data", (chunk: Buffer) => received.push(chunk));
      socket.once("end", () => socket.end("stream: OK\0"));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("No fue posible iniciar el daemon de prueba.");
    }
    try {
      const clamAv = new ClamAvDocumentScanner({
        host: "127.0.0.1",
        port: address.port,
        timeoutMs: 1_000,
        maximumBytes: 1024,
      });
      await expect(clamAv.scan(new Uint8Array([1, 2, 3]))).resolves.toEqual({
        verdict: "clean",
      });
      expect(Buffer.concat(received).subarray(0, 10).toString()).toBe(
        "zINSTREAM\0",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
