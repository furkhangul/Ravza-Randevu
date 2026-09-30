/**
 * Okunaklı geçici şifre: karışan karakterler (0/O, 1/l/I) yok, harf ve rakam
 * içerir, en az 12 karakter; kullanıcı ilk girişten sonra değiştirmelidir.
 */
export function temporaryPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const letters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `${letters.slice(0, 4)}-${letters.slice(4, 8)}-${letters.slice(8, 11)}${(bytes[11] % 8) + 2}`;
}
