// Lightweight AES-256-GCM wrapper for encrypting per-integration secrets
// (API keys, webhook auth headers, OpenTable tokens, etc.). The encryption
// key comes from the INTEGRATION_ENC_KEY env var. In dev we fall back to a
// fixed string so onboarding works without extra setup, but production
// deployments MUST set a real 32-byte key (base64 or hex) before anyone
// stores real credentials.
//
// Stored format (string): "v1:<base64-iv>:<base64-authtag>:<base64-ciphertext>"
//   - iv is 12 bytes (GCM standard).
//   - authtag is the 16-byte GCM tag.
//   - ciphertext encrypts UTF-8 JSON.

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.INTEGRATION_ENC_KEY || "";
  if (!raw) {
    // Dev fallback. Loud warning so we don't ship to prod by accident.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "INTEGRATION_ENC_KEY is required in production. Set it to a 32-byte base64 or hex string before storing integration secrets."
      );
    }
    console.warn(
      "[crypto] INTEGRATION_ENC_KEY not set; using insecure dev fallback. DO NOT use this key in production."
    );
    cachedKey = crypto.createHash("sha256").update("dev-only-integration-key").digest();
    return cachedKey;
  }
  // Accept hex (64 chars) or base64 (44ish chars). Both must decode to 32 bytes.
  let buf: Buffer;
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === KEY_BYTES * 2) {
    buf = Buffer.from(raw, "hex");
  } else {
    buf = Buffer.from(raw, "base64");
  }
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `INTEGRATION_ENC_KEY must decode to exactly ${KEY_BYTES} bytes (got ${buf.length}). Use 'openssl rand -base64 32'.`
    );
  }
  cachedKey = buf;
  return cachedKey;
}

export function encryptJSON(value: unknown): string {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptJSON<T = unknown>(blob: string | null | undefined): T | null {
  if (!blob) return null;
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted blob format (expected v1:iv:tag:ct)");
  }
  const key = loadKey();
  const iv = Buffer.from(parts[1]!, "base64");
  const tag = Buffer.from(parts[2]!, "base64");
  const ct = Buffer.from(parts[3]!, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(pt.toString("utf8")) as T;
}

// Convenience: produce a frontend-safe summary of which fields are set
// without leaking the actual values. Returns e.g. { hasApiKey: true,
// hasWebhookSecret: false } for any encrypted blob shape.
export function summarizeAuth(blob: string | null | undefined): Record<string, boolean> {
  if (!blob) return {};
  try {
    const decoded = decryptJSON<Record<string, unknown>>(blob);
    if (!decoded || typeof decoded !== "object") return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(decoded)) {
      out[`has${k.charAt(0).toUpperCase() + k.slice(1)}`] =
        typeof v === "string" ? v.length > 0 : v != null;
    }
    return out;
  } catch {
    return { __decryptError: true };
  }
}
