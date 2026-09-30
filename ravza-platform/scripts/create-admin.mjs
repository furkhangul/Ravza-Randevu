#!/usr/bin/env node
/**
 * Yönetim paneli için kullanıcı adı + parola kaydı üretir.
 *
 * Kullanım:
 *   node scripts/create-admin.mjs <kullanici-adi> <e-posta> "<Ad Soyad>"
 *
 * Parola sorulmaz, üretilir ve bir kez ekrana yazılır: kimse zayıf parola
 * seçemesin ve parola komut geçmişinde kalmasın diye. Betik hiçbir yere
 * yazmaz; çıktıdaki SQL'i siz çalıştırırsınız.
 */

import { webcrypto } from 'node:crypto';

const ITERATIONS = 100_000;

function hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(value) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  webcrypto.getRandomValues(bytes);
  return hex(bytes.buffer);
}

/** Okunabilir ama tahmin edilemez parola: 4 blok x 5 karakter. */
function generatePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(20);
  webcrypto.getRandomValues(bytes);
  const characters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  const blocks = [];
  for (let index = 0; index < 20; index += 5) {
    blocks.push(characters.slice(index, index + 5).join(''));
  }
  return blocks.join('-');
}

async function derive(password, saltHex) {
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return hex(bits);
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

const [username, email, displayName = ''] = process.argv.slice(2);

if (!username || !email) {
  console.error(
    'Kullanım: node scripts/create-admin.mjs <kullanici-adi> <e-posta> "<Ad Soyad>"',
  );
  process.exit(1);
}

const password = generatePassword();
const salt = randomHex(16);
const hash = await derive(password, salt);
const id = randomHex(16);
const now = Math.floor(Date.now() / 1000);

console.log('');
console.log('Kullanıcı adı : ' + username.toLowerCase());
console.log('Parola        : ' + password);
console.log('');
console.log('Bu parola bir daha gösterilmeyecek. Parola yöneticinize kaydedin.');
console.log('');
console.log('Aşağıdaki SQL ile hesabı oluşturun:');
console.log('  npx wrangler d1 execute <VERITABANI> --remote --command "..."');
console.log('');
console.log(
  `INSERT INTO admin_credentials (id, username, email, display_name, password_hash, password_salt, iterations, status, failed_attempts, created_at) VALUES ('${id}', '${sqlEscape(username.toLowerCase())}', '${sqlEscape(email.toLowerCase())}', '${sqlEscape(displayName)}', '${hash}', '${salt}', ${ITERATIONS}, 'active', 0, ${now});`,
);
console.log('');
