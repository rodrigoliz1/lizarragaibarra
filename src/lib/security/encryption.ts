import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

type RuntimeEnvironment = Record<string, string | undefined>;

function isDeployed(environment: RuntimeEnvironment) {
  return (
    Boolean(environment.VERCEL_ENV) || environment.NODE_ENV === "production"
  );
}

function decodeKey(encoded: string, name: string) {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error(`${name} debe contener exactamente 32 bytes en Base64.`);
  }
  return key;
}

function developmentKey() {
  return createHash("sha256")
    .update("lizarraga-ibarra-local-encryption-key-not-for-deployment")
    .digest();
}

function decodeBase64Url(value: string) {
  if (value && !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Envelope cifrado no válido.");
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new Error("Envelope cifrado no válido.");
  }
  return decoded;
}

function currentKey(environment: RuntimeEnvironment) {
  const encoded = environment.DATA_ENCRYPTION_KEY_CURRENT?.trim();
  if (!encoded) {
    if (isDeployed(environment)) {
      throw new Error(
        "DATA_ENCRYPTION_KEY_CURRENT es obligatoria en entornos desplegados.",
      );
    }
    return developmentKey();
  }
  return decodeKey(encoded, "DATA_ENCRYPTION_KEY_CURRENT");
}

function keyring(environment: RuntimeEnvironment) {
  const currentVersion =
    environment.DATA_ENCRYPTION_KEY_VERSION?.trim() || "v1";
  const keys = new Map<string, Buffer>([
    [currentVersion, currentKey(environment)],
  ]);
  const previous = environment.DATA_ENCRYPTION_KEY_PREVIOUS?.trim();
  const previousVersion =
    environment.DATA_ENCRYPTION_KEY_PREVIOUS_VERSION?.trim();
  if (previous || previousVersion) {
    if (!previous || !previousVersion) {
      throw new Error(
        "La clave anterior y su versión deben configurarse juntas.",
      );
    }
    keys.set(
      previousVersion,
      decodeKey(previous, "DATA_ENCRYPTION_KEY_PREVIOUS"),
    );
  }
  return { currentVersion, keys };
}

export function encryptSensitiveString(
  plaintext: string,
  environment: RuntimeEnvironment = process.env,
) {
  const { currentVersion, keys } = keyring(environment);
  const key = keys.get(currentVersion);
  if (!key) throw new Error("No se pudo resolver la clave de cifrado activa.");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(currentVersion, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    currentVersion,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSensitiveString(
  envelope: string,
  environment: RuntimeEnvironment = process.env,
) {
  const parts = envelope.split(".");
  if (parts.length !== 4) throw new Error("Envelope cifrado no válido.");
  const [version, encodedIv, encodedTag, encodedCiphertext] = parts;
  const { keys } = keyring(environment);
  const key = keys.get(version);
  if (!key) throw new Error("La versión de la clave no está disponible.");
  const iv = decodeBase64Url(encodedIv);
  const tag = decodeBase64Url(encodedTag);
  if (iv.length !== IV_BYTES || tag.length !== 16) {
    throw new Error("Envelope cifrado no válido.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(version, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(decodeBase64Url(encodedCiphertext)),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptSensitiveJson(
  value: unknown,
  environment: RuntimeEnvironment = process.env,
) {
  return encryptSensitiveString(JSON.stringify(value), environment);
}

export function decryptSensitiveJson<T>(
  envelope: string,
  environment: RuntimeEnvironment = process.env,
) {
  return JSON.parse(decryptSensitiveString(envelope, environment)) as T;
}
