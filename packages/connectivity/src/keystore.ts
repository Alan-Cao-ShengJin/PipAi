import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

// Local encrypted storage. The encryption key belongs only to the signer process.
// A production deployment must replace this with a reviewed managed signing facility.
export function loadAgent(path: string, encryptionKey: string) {
  if (!/^[0-9a-f]{64}$/.test(encryptionKey)) throw new Error("A 32-byte signer encryption key is required.");
  const key = Buffer.from(encryptionKey, "hex");
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from("pip-hyperliquid-testnet-agent-v1"));
    const encrypted = Buffer.concat([cipher.update(generatePrivateKey(), "utf8"), cipher.final()]);
    writeFileSync(path, JSON.stringify({ version: 1, iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), encrypted: encrypted.toString("hex") }), { flag: "wx", mode: 0o600 });
  }
  const data = z.object({ version: z.literal(1), iv: z.string().regex(/^[0-9a-f]{24}$/), tag: z.string().regex(/^[0-9a-f]{32}$/), encrypted: z.string().regex(/^[0-9a-f]+$/) }).strict().parse(JSON.parse(readFileSync(path, "utf8")));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(data.iv, "hex"));
  decipher.setAAD(Buffer.from("pip-hyperliquid-testnet-agent-v1"));
  decipher.setAuthTag(Buffer.from(data.tag, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(data.encrypted, "hex")), decipher.final()]);
  try { return privateKeyToAccount(z.string().regex(/^0x[0-9a-f]{64}$/).parse(plaintext.toString("utf8")) as `0x${string}`); }
  finally { plaintext.fill(0); key.fill(0); }
}
