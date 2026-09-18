import { createConnection } from "node:net";

import {
  DocumentScannerInputError,
  DocumentScannerUnavailableError,
  type DocumentScanner,
  type DocumentScannerResult,
} from "@/lib/documents/scanner/types";

const CLAMAV_COMMAND = Buffer.from("zINSTREAM\0", "utf8");
const CLAMAV_CHUNK_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024;

type ClamAvConfiguration = {
  host: string;
  port: number;
  timeoutMs: number;
  maximumBytes: number;
};

export function createClamAvInstreamPayload(
  bytes: Uint8Array,
  maximumBytes: number,
) {
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) {
    throw new DocumentScannerInputError();
  }
  const frames: Buffer[] = [CLAMAV_COMMAND];
  for (
    let offset = 0;
    offset < bytes.byteLength;
    offset += CLAMAV_CHUNK_BYTES
  ) {
    const chunk = Buffer.from(
      bytes.buffer,
      bytes.byteOffset + offset,
      Math.min(CLAMAV_CHUNK_BYTES, bytes.byteLength - offset),
    );
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(chunk.byteLength, 0);
    frames.push(length, chunk);
  }
  frames.push(Buffer.alloc(4));
  return Buffer.concat(frames);
}

function safeThreatName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || undefined;
}

export function parseClamAvResponse(
  rawResponse: string,
): DocumentScannerResult {
  const response = rawResponse.replace(/\0[\s\S]*$/, "").trim();
  if (/^[^:]+:\s+OK$/i.test(response)) return { verdict: "clean" };
  const infected = response.match(/^[^:]+:\s+(.+)\s+FOUND$/i);
  if (infected) {
    return {
      verdict: "infected",
      threat: safeThreatName(infected[1] ?? ""),
    };
  }
  throw new DocumentScannerUnavailableError();
}

export class ClamAvDocumentScanner implements DocumentScanner {
  readonly name = "clamav" as const;

  constructor(private readonly configuration: ClamAvConfiguration) {
    if (
      !configuration.host.trim() ||
      !Number.isInteger(configuration.port) ||
      configuration.port < 1 ||
      configuration.port > 65_535 ||
      configuration.timeoutMs < 1 ||
      configuration.maximumBytes < 1
    ) {
      throw new DocumentScannerUnavailableError(
        "La configuración del servicio de análisis no es válida.",
      );
    }
  }

  async scan(bytes: Uint8Array): Promise<DocumentScannerResult> {
    const payload = createClamAvInstreamPayload(
      bytes,
      this.configuration.maximumBytes,
    );
    return new Promise((resolve, reject) => {
      let response = "";
      let settled = false;
      const socket = createConnection({
        host: this.configuration.host,
        port: this.configuration.port,
      });

      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        socket.destroy();
        reject(new DocumentScannerUnavailableError());
      };
      const finish = () => {
        if (settled) return;
        try {
          const result = parseClamAvResponse(response);
          settled = true;
          clearTimeout(deadline);
          socket.destroy();
          resolve(result);
        } catch {
          fail();
        }
      };

      const deadline = setTimeout(fail, this.configuration.timeoutMs);
      deadline.unref();
      socket.setTimeout(this.configuration.timeoutMs);
      socket.once("connect", () => socket.end(payload));
      socket.on("data", (chunk: Buffer) => {
        if (settled) return;
        if (
          Buffer.byteLength(response) + chunk.byteLength >
          MAX_RESPONSE_BYTES
        ) {
          fail();
          return;
        }
        response += chunk.toString("utf8");
        if (response.includes("\0") || response.includes("\n")) finish();
      });
      socket.once("timeout", fail);
      socket.once("error", fail);
      socket.once("end", () => {
        if (response) finish();
        else fail();
      });
      socket.once("close", () => {
        if (!settled) fail();
      });
    });
  }
}
