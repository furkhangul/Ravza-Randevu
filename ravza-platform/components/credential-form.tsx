'use client';
import { useState, type FormEvent } from 'react';
import Link from '@/components/safe-link';
import { loginReturnPath } from '@/lib/login-path';

export function CredentialForm({ staff = false, register: initialRegister = false, returnTo }: { staff?: boolean; register?: boolean; returnTo?: string }) {
  const [register, setRegister] = useState(initialRegister);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    if (register && password !== data.get('repeat')) { setError('Parolalar aynı olmalı.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(staff ? '/api/auth/admin' : '/api/auth/customer', {
        method: register && !staff ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: data.get('username'), email: data.get('email'), fullName: data.get('fullName'), password, consent: data.get('consent') === 'on', disclaimer: data.get('disclaimer') === 'on' }),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        const errors: Record<string, string> = {
          invalid_credentials: 'Giriş bilgilerinizi kontrol edin. E-posta / kullanıcı adı veya parola hatalı.',
          account_exists: 'Bu e-posta ile hesap zaten var. Giriş yap seçeneğini kullanın.',
          invalid_registration: 'Ad soyad, e-posta ve onayı kontrol edin. Parola en az 12 karakter, harf ve rakam içermeli.',
          account_locked: 'Çok sayıda hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin.',
          account_suspended: 'Hesabınız aktif değil. Ekibimizle iletişime geçin.',
          rate_limited: 'Kısa sürede çok sayıda deneme yapıldı. Bir dakika sonra tekrar deneyin.',
          auth_store_unavailable: 'Giriş hizmetine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
        };
        throw new Error(errors[result.error ?? ''] || 'Giriş tamamlanamadı. Lütfen tekrar deneyin.');
      }
      window.location.assign(loginReturnPath(returnTo, staff));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantınızı kontrol edip tekrar deneyin.');
      setBusy(false);
    }
  }
  const input = 'mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#163c2b] px-4 text-white outline-none focus:border-[#d2b77b]';
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {!staff && (
        <div className="flex gap-2" aria-label="Hesap işlemi">
          {[false, true].map(value => <button key={String(value)} type="button" disabled={busy} aria-pressed={register === value} onClick={() => { setRegister(value); setError(''); }} className={`min-h-10 flex-1 rounded-xl border px-3 text-sm ${register === value ? 'border-[#d2b77b] bg-[#d2b77b] text-[#071c14]' : 'border-white/20'}`}>{value ? 'Hesap oluştur' : 'Giriş yap'}</button>)}
        </div>
      )}
      {register && !staff && <label className="block text-sm">Ad soyad<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" className={input} /></label>}
      {staff ? <label className="block text-sm">Kullanıcı adı<input name="username" required autoComplete="username" maxLength={120} className={input} /></label>
        : <label className="block text-sm">E-posta<input name="email" required type="email" autoComplete="email" maxLength={254} className={input} /></label>}
      <label className="block text-sm">Parola<input name="password" required type={showPassword ? 'text' : 'password'} minLength={register ? 12 : undefined} maxLength={200} autoComplete={register ? 'new-password' : 'current-password'} className={input} /></label>
      <button type="button" className="text-xs text-[#ead7a9] underline" aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Parolayı gizle' : 'Parolayı göster'}</button>
      {register && !staff && <>
        <p className="text-xs text-white/65">En az 12 karakter; en az bir harf ve bir rakam.</p>
        <label className="block text-sm">Parola tekrar<input name="repeat" required type={showPassword ? 'text' : 'password'} minLength={12} maxLength={200} autoComplete="new-password" className={input} /></label>
        <label className="flex items-start gap-3 text-xs leading-6"><input name="consent" type="checkbox" required className="mt-1 size-4 shrink-0" /><span><Link href="/aydinlatma" target="_blank" rel="noopener noreferrer" className="underline">Aydınlatma metnini</Link> okudum ve <Link href="/sozlesme" target="_blank" rel="noopener noreferrer" className="underline">hizmet koşullarını</Link> kabul ediyorum.</span></label>
        <label className="flex items-start gap-3 text-xs leading-6"><input name="disclaimer" type="checkbox" required className="mt-1 size-4 shrink-0" /><span><Link href="/sorumluluk-reddi" target="_blank" rel="noopener noreferrer" className="underline">Sorumluluk reddi beyanını</Link> okudum, kabul ediyorum; randevu veya QR kodunun girişi garanti etmediğini biliyorum.</span></label>
      </>}
      {error && <p role="alert" className="rounded-xl border border-red-300/40 bg-red-950/60 p-3 text-sm text-red-100">{error}</p>}
      <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#d2b77b] px-4 font-semibold text-[#071c14] disabled:opacity-60">{busy ? 'İşleminiz tamamlanıyor…' : register ? 'Hesabımı oluştur' : staff ? 'Yönetim paneline gir' : 'Hesabıma gir'}</button>
      {staff && <Link href="/sifremi-unuttum" className="inline-block text-xs text-white/70 underline">Parolamı unuttum</Link>}
    </form>
  );
}
