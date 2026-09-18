import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AllowedPrivateDocumentType,
  PrivateStorageProvider,
} from "@/lib/storage/types";

export class LocalPrivateStorageProvider implements PrivateStorageProvider {
  readonly name = "local" as const;

  constructor(private readonly baseDirectory: string) {}

  private resolveKey(key: string) {
    if (!/^(?:quarantine\/)?[a-f0-9]{2}\/[a-f0-9]{32}$/.test(key)) {
      throw new Error("Clave de almacenamiento inválida.");
    }
    const resolved = path.resolve(this.baseDirectory, key);
    const base = `${path.resolve(this.baseDirectory)}${path.sep}`;
    if (!resolved.startsWith(base))
      throw new Error("Ruta de almacenamiento inválida.");
    return resolved;
  }

  async put(input: {
    bytes: Uint8Array;
    mimeType: AllowedPrivateDocumentType;
    quarantine?: boolean;
    checksumSha256?: string;
  }) {
    if (
      input.checksumSha256 &&
      createHash("sha256").update(input.bytes).digest("hex") !==
        input.checksumSha256
    ) {
      throw new Error("El checksum del objeto privado no coincide.");
    }
    const id = randomBytes(16).toString("hex");
    const key = `${input.quarantine ? "quarantine/" : ""}${id.slice(0, 2)}/${id}`;
    const target = this.resolveKey(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.bytes, { flag: "wx", mode: 0o600 });
    return { key, size: input.bytes.byteLength, mimeType: input.mimeType };
  }

  async get(key: string) {
    return new Uint8Array(await readFile(this.resolveKey(key)));
  }

  async delete(key: string) {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async createSignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds?: number,
  ) {
    void filename;
    void expiresInSeconds;
    this.resolveKey(key);
    if (key.startsWith("quarantine/")) {
      throw new Error("Los objetos en cuarentena no admiten descarga.");
    }
    return null;
  }
}
