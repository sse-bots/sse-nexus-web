import crypto from "crypto";
import type { KeyScope } from "./types";

/**
 * Exact byte-for-byte equivalent of activation.py's hash_activation_key().
 * Strips all whitespace, uppercases, and returns SHA-256 hex digest.
 */
export function hashActivationKey(key: string): string {
  const normalized = (key || "").trim().toUpperCase().replace(/\s+/g, "");
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function generateActivationKey(scope: KeyScope = "single"): string {
  const prefix =
    scope === "global" ? "SSE-GLB-" : scope === "bundle" ? "SSE-BND-" : "SSE-";
  return prefix + crypto.randomBytes(20).toString("hex").toUpperCase();
}

export function normalizedBotSlug(name: string): string {
  let slug = (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  while (slug === "SSE" || slug.startsWith("SSE-")) {
    slug = slug.startsWith("SSE-") ? slug.slice(4) : "";
  }
  return slug.slice(0, 30).replace(/^-+|-+$/g, "") || "BOT";
}

function getEncryptionKeyBuffer(): Buffer {
  const raw =
    process.env.KEY_ENCRYPTION_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "fallback-dev-secret-change-in-production";
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptKeyForWeb(plaintext: string): string {
  const key = getEncryptionKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptKeyForWeb(payload?: string | null): string | null {
  if (!payload || typeof payload !== "string") return null;
  const parts = payload.split(":");
  if (parts.length !== 3) return null;
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const key = getEncryptionKeyBuffer();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
