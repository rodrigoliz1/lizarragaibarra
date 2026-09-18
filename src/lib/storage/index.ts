import "server-only";

import path from "node:path";

import { getDocumentMaxUploadBytes } from "@/lib/documents/config";
import { LocalPrivateStorageProvider } from "@/lib/storage/local";
import { S3PrivateStorageProvider } from "@/lib/storage/s3";
import {
  ALLOWED_PRIVATE_DOCUMENT_TYPES,
  type AllowedPrivateDocumentType,
} from "@/lib/storage/types";

export * from "./types";

export function validatePrivateUpload(input: {
  bytes: Uint8Array;
  declaredMimeType: string;
  maximumBytes?: number;
}) {
  const maximumBytes = input.maximumBytes ?? getDocumentMaxUploadBytes();
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > maximumBytes) {
    throw new Error("El archivo está vacío o supera el límite permitido.");
  }
  if (
    !ALLOWED_PRIVATE_DOCUMENT_TYPES.includes(
      input.declaredMimeType as AllowedPrivateDocumentType,
    )
  ) {
    throw new Error("El formato del archivo no está permitido.");
  }

  const bytes = input.bytes;
  const isPdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isZip =
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  const isAvif =
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)));
  const signatureMatches =
    (input.declaredMimeType === "application/pdf" && isPdf) ||
    (input.declaredMimeType === "image/jpeg" && isJpeg) ||
    (input.declaredMimeType === "image/png" && isPng) ||
    (input.declaredMimeType === "image/webp" && isWebp) ||
    (input.declaredMimeType === "image/avif" && isAvif) ||
    (input.declaredMimeType.includes("officedocument") && isZip);
  if (!signatureMatches)
    throw new Error("El contenido del archivo no coincide con su formato.");

  return input.declaredMimeType as AllowedPrivateDocumentType;
}

export function getPrivateStorageProvider() {
  const provider = process.env.STORAGE_PROVIDER?.toLowerCase() || "local";
  if (provider === "s3") {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("La configuración de almacenamiento S3 está incompleta.");
    }
    return new S3PrivateStorageProvider({
      endpoint,
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
      sessionToken: process.env.S3_SESSION_TOKEN,
      requestTimeoutMs: Number(process.env.S3_REQUEST_TIMEOUT_MS || 12_000),
      serverSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION || "AES256",
      kmsKeyId: process.env.S3_KMS_KEY_ID,
    });
  }
  if (provider !== "local") {
    throw new Error(`Proveedor de almacenamiento no soportado: ${provider}`);
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview"
  ) {
    throw new Error("El almacenamiento local no está permitido en producción.");
  }
  const directory =
    process.env.PRIVATE_UPLOAD_DIR ||
    path.join(process.cwd(), ".data", "uploads");
  return new LocalPrivateStorageProvider(directory);
}
