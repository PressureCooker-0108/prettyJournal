/**
 * Web Crypto API client-side E2EE helper functions.
 * Uses AES-GCM (256-bit key length) and PBKDF2 for key derivation.
 */

// Helper to convert array buffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert base64 to array buffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a securely salted AES-GCM 256-bit CryptoKey using PBKDF2.
 * @param passphrase User's raw passphrase string
 * @param saltStr Secure user-specific static salt (e.g., truncated hash of Clerk userId)
 */
export async function deriveJournalKey(passphrase: string, saltStr: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passphraseBytes = enc.encode(passphrase);
  const saltBytes = enc.encode(saltStr);

  // Import raw passphrase as a key-producing material
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive the AES-GCM 256-bit key using PBKDF2 with 100,000 iterations and SHA-256
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, // key is not extractable (highly secure, stays in-memory)
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts plainText using the derived CryptoKey with AES-GCM.
 * Outputs format: "IV_in_base64:Ciphertext_in_base64"
 */
export async function encryptJournalContent(plainText: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const plainTextBytes = enc.encode(plainText);

  // Generate cryptographically secure random 12-byte IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt content
  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plainTextBytes
  );

  const ivBase64 = arrayBufferToBase64(iv);
  const ciphertextBase64 = arrayBufferToBase64(cipherBuffer);

  return `${ivBase64}:${ciphertextBase64}`;
}

/**
 * Decrypts a combined payload format ("IV_in_base64:Ciphertext_in_base64") back to raw plainText.
 */
export async function decryptJournalContent(combinedPayload: string, key: CryptoKey): Promise<string> {
  const parts = combinedPayload.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid E2EE payload format");
  }

  const ivBase64 = parts[0];
  const ciphertextBase64 = parts[1];

  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);

  // Decrypt content
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Helper to generate a secure static salt from Clerk userId by hashing it.
 * Takes the SHA-256 hash of the userId and converts it to a hex string.
 */
export async function getSaltFromUserId(userId: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(userId);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 32); // Return a secure static 32-character string
}
