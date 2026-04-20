import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Appointment } from "./appointments";

const ALGO = "aes-256-gcm";
const SCRYPT_SALT = "voiceflow-appt-v1";

function getKey(): Buffer {
  const secret = process.env.BOOKINGS_ENCRYPTION_KEY;
  if (!secret || secret.length < 8) {
    throw new Error("BOOKINGS_ENCRYPTION_KEY must be at least 8 characters");
  }
  return scryptSync(secret, SCRYPT_SALT, 32);
}

function defaultFilePath() {
  const override = process.env.BOOKINGS_FILE_PATH;
  if (override) return path.resolve(process.cwd(), override);
  return path.join(process.cwd(), "data", "bookings.enc");
}

function encryptJson(json: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    d: enc.toString("base64"),
  });
}

function decryptJson(payload: string, key: Buffer): string {
  const parsed = JSON.parse(payload) as {
    v: number;
    iv: string;
    tag: string;
    d: string;
  };
  if (parsed.v !== 1) throw new Error("Unknown file format");
  const decipher = createDecipheriv(
    ALGO,
    key,
    Buffer.from(parsed.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  return (
    decipher.update(Buffer.from(parsed.d, "base64"), undefined, "utf8") +
    decipher.final("utf8")
  );
}

let writeChain: Promise<void> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function readEncryptedBookings(): Promise<Appointment[]> {
  const filePath = defaultFilePath();
  let raw: string;
  try {
    raw = (await readFile(filePath, "utf8")).trim();
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const key = getKey();
    const json = decryptJson(raw, key);
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return [];
    return data as Appointment[];
  } catch {
    throw new Error(
      "Could not decrypt bookings file — wrong BOOKINGS_ENCRYPTION_KEY or corrupt file"
    );
  }
}

export async function writeEncryptedBookings(
  list: Appointment[]
): Promise<void> {
  const filePath = defaultFilePath();
  const key = getKey();
  const json = JSON.stringify(list);
  const encrypted = encryptJson(json, key);
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, encrypted, "utf8");
}

export async function withBookingsLock<T>(
  fn: (list: Appointment[]) => Promise<{ list: Appointment[]; result: T }>
): Promise<T> {
  return runExclusive(async () => {
    const list = await readEncryptedBookings();
    const { list: next, result } = await fn(list);
    await writeEncryptedBookings(next);
    return result;
  });
}

/** Serialized reads/writes so list + PATCH do not clobber each other. */
export function fileStoreRead<T>(fn: () => Promise<T>): Promise<T> {
  return runExclusive(fn);
}
