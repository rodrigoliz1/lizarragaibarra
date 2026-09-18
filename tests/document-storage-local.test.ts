import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalPrivateStorageProvider } from "@/lib/storage/local";

describe("cuarentena local de documentos", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "xs-documents-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("guarda documentos bajo un prefijo de cuarentena y verifica checksum", async () => {
    const storage = new LocalPrivateStorageProvider(directory);
    const bytes = new TextEncoder().encode("%PDF-1.7 contenido");
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    const stored = await storage.put({
      bytes,
      mimeType: "application/pdf",
      quarantine: true,
      checksumSha256,
    });

    expect(stored.key).toMatch(/^quarantine\/[a-f0-9]{2}\/[a-f0-9]{32}$/);
    expect(Array.from(await storage.get(stored.key))).toEqual(
      Array.from(bytes),
    );
    await expect(
      storage.createSignedDownloadUrl(stored.key, "documento.pdf"),
    ).rejects.toThrow("cuarentena");
  });

  it("rechaza checksums y claves manipulados", async () => {
    const storage = new LocalPrivateStorageProvider(directory);
    await expect(
      storage.put({
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "application/pdf",
        checksumSha256: "0".repeat(64),
      }),
    ).rejects.toThrow("checksum del objeto privado no coincide");
    await expect(storage.get("../secreto")).rejects.toThrow(
      "Clave de almacenamiento inválida",
    );
  });
});
