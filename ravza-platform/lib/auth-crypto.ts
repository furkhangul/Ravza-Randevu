/**
 * Parola ve oturum jetonu için kriptografik yardımcılar.
 *
 * Cloudflare Workers üzerinde Node'un `crypto` modülü yerine WebCrypto
 * kullanılır; buradaki her şey `globalThis.crypto` ile çalışır.
 *
 * Parolalar PBKDF2-SHA256 ile türetilir. Düz parola hiçbir yerde saklanmaz,
 * loglanmaz ve geri döndürülemez.
 */

/** Cloudflare Workers WebCrypto'nun desteklediği güvenli üst sınıra uygun değer. */
export const DEFAULT_ITERATIONS = 100_000;

const KEY_LENGTH_BITS = 256;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Kriptografik olarak rastgele hex dizi (tuz, oturum jetonu, state, nonce). */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return toHex(digest);
}

export async function derivePassword(
  password: string,
  saltHex: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(saltHex) as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    key,
    KEY_LENGTH_BITS,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<{
  hash: string;
  salt: string;
  iterations: number;
}> {
  const salt = randomToken(16);
  const hash = await derivePassword(password, salt, DEFAULT_ITERATIONS);
  return { hash, salt, iterations: DEFAULT_ITERATIONS };
}

/** Uzunluk ve içerik sızdırmayan sabit süreli karşılaştırma. */
export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyPassword(
  password: string,
  stored: { hash: string; salt: string; iterations: number },
): Promise<boolean> {
  const candidate = await derivePassword(
    password,
    stored.salt,
    stored.iterations,
  );
  return timingSafeEqual(candidate, stored.hash);
}

export type PasswordProblem =
  | 'too_short'
  | 'too_long'
  | 'needs_letter'
  | 'needs_digit';

/**
 * Yönetici parolası için asgari kural. Karmaşıklık dayatmak yerine uzunluğu
 * öne alır; NIST 800-63B yaklaşımı budur.
 */
export function checkPasswordStrength(password: string): PasswordProblem[] {
  const problems: PasswordProblem[] = [];
  if (password.length < 12) problems.push('too_short');
  if (password.length > 200) problems.push('too_long');
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password)) problems.push('needs_letter');
  if (!/\d/.test(password)) problems.push('needs_digit');
  return problems;
}

export const passwordProblemMessages: Record<PasswordProblem, string> = {
  too_short: 'Parola en az 12 karakter olmalı.',
  too_long: 'Parola 200 karakteri aşamaz.',
  needs_letter: 'Parola en az bir harf içermeli.',
  needs_digit: 'Parola en az bir rakam içermeli.',
};
