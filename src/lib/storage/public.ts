import "server-only";
import path from "node:path";
import { LocalPrivateStorageProvider } from "./local";
import { S3PrivateStorageProvider } from "./s3";
/** Editorial objects never share a bucket or directory with client files. */
export function getPublicMediaStorageProvider() {
  if ((process.env.STORAGE_PROVIDER || "local") === "s3") {
    const bucket = process.env.S3_PUBLIC_MEDIA_BUCKET;
    if (!bucket || bucket === process.env.S3_BUCKET)
      throw new Error(
        "Configure un bucket editorial independiente del bucket privado.",
      );
    const {
      S3_ENDPOINT: endpoint,
      S3_REGION: region,
      S3_ACCESS_KEY_ID: accessKeyId,
      S3_SECRET_ACCESS_KEY: secretAccessKey,
    } = process.env;
    if (!endpoint || !region || !accessKeyId || !secretAccessKey)
      throw new Error("Configure el almacenamiento editorial.");
    return new S3PrivateStorageProvider({
      endpoint,
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
    });
  }
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production")
    throw new Error(
      "El almacenamiento editorial local sólo está disponible en desarrollo.",
    );
  const directory =
    process.env.PUBLIC_MEDIA_DIR ||
    path.join(process.cwd(), ".data", "public-media");
  const privateDirectory =
    process.env.PRIVATE_UPLOAD_DIR ||
    path.join(process.cwd(), ".data", "uploads");
  const normalizedDirectory = path.normalize(
    path.isAbsolute(directory)
      ? directory
      : path.join(/* turbopackIgnore: true */ process.cwd(), directory),
  );
  const normalizedPrivateDirectory = path.normalize(
    path.isAbsolute(privateDirectory)
      ? privateDirectory
      : path.join(/* turbopackIgnore: true */ process.cwd(), privateDirectory),
  );
  if (normalizedDirectory === normalizedPrivateDirectory)
    throw new Error("Las carpetas públicas y privadas deben ser distintas.");
  return new LocalPrivateStorageProvider(directory);
}
