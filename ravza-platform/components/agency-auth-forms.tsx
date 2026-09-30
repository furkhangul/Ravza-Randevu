'use client';

import { type SubmitEvent, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from '@/components/safe-link';

const field =
  'mt-1 min-h-12 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus-visible:border-[#d2b77b] focus-visible:outline-none';
const label = 'block text-xs font-medium text-white/70';

const loginErrors: Record<string, string> = {
  invalid_credentials: 'E-posta veya şifre hatalı.',
  agency_pending: 'Başvurunuz inceleniyor. Onaylandığında giriş yapabilirsiniz.',
  agency_suspended: 'Acente hesabınız askıya alınmış. Lütfen bizimle iletişime geçin.',
  account_locked: 'Çok fazla hatalı deneme. Hesap 15 dakika kilitlendi.',
  rate_limited: 'Çok fazla deneme. Bir dakika sonra tekrar deneyin.',
};

export function AgencyLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/agency/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string; reason?: string | null };
      if (response.ok) {
        window.location.assign('/acente');
        return;
      }
      setError(
        payload.error === 'agency_rejected'
          ? `Başvurunuz onaylanmadı${payload.reason ? `: ${payload.reason}` : '.'}`
          : (loginErrors[payload.error ?? ''] ?? 'Giriş şu anda yapılamıyor.'),
      );
    } catch {
      setError('Bağlantı kurulamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className={label}>
        E-posta
        <input className={field} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className={label}>
        Şifre
        <input className={field} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error ? <p role="alert" className="rounded-xl bg-[#9f432b]/25 px-3 py-2 text-sm text-[#ffd7c9]">{error}</p> : null}
      <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d2b77b] font-semibold text-[#071c14] disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Acente girişi
      </button>
      <p className="text-center text-sm text-white/65">
        Hesabınız yok mu?{' '}
        <Link href="/acente/basvuru" className="font-semibold text-[#ead7a9] underline">
          Acente başvurusu yapın
        </Link>
      </p>
    </form>
  );
}

const initial = {
  companyName: '',
  taxOffice: '',
  taxNumber: '',
  tursabNumber: '',
  address: '',
  city: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  password: '',
  passwordAgain: '',
  initialCredits: '',
  termsAccepted: false,
  disclaimerAccepted: false,
};

export function AgencyApplicationForm() {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [done, setDone] = useState(false);
  const set = (key: keyof typeof initial) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value });

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== form.passwordAgain) {
      setError({ text: 'Şifreler aynı değil.', field: 'password' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { passwordAgain: _ignored, ...payload } = form;
      const response = await fetch('/api/agency/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, initialCredits: form.initialCredits === '' ? 0 : Number(form.initialCredits) }),
      });
      const result = (await response.json()) as { error?: string; field?: string };
      if (response.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setError({ text: result.error ?? 'Başvuru gönderilemedi.', field: result.field });
    } catch {
      setError({ text: 'Bağlantı kurulamadı.' });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-2xl bg-white/10 p-6">
        <CheckCircle2 className="size-8 text-[#d2b77b]" />
        <p className="mt-3 font-serif text-2xl">Başvurunuz alındı</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Ekibimiz bilgilerinizi inceleyecek. Onaylandığında {form.contactEmail} adresi ve belirlediğiniz şifre ile
          acente girişi yapabilirsiniz{form.initialCredits ? `; talep ettiğiniz ${form.initialCredits} kontör onayla birlikte hesabınıza yüklenecek` : ''}.
        </p>
        <Link href="/acente/giris" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#d2b77b] px-5 font-semibold text-[#071c14]">
          Acente girişine git
        </Link>
      </div>
    );
  }

  const err = (key: string) => (error?.field === key ? 'border-[#ff9f80]' : '');
  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#ead7a9]">Şirket bilgileri</legend>
        <label className={label}>Ticari unvan<input className={`${field} ${err('companyName')}`} required value={form.companyName} onChange={set('companyName')} placeholder="Örnek Turizm Ltd. Şti." /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Vergi dairesi<input className={`${field} ${err('taxOffice')}`} required value={form.taxOffice} onChange={set('taxOffice')} /></label>
          <label className={label}>Vergi no / TC kimlik no<input className={`${field} ${err('taxNumber')}`} required inputMode="numeric" value={form.taxNumber} onChange={set('taxNumber')} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>TÜRSAB belge no (varsa)<input className={field} value={form.tursabNumber} onChange={set('tursabNumber')} /></label>
          <label className={label}>Şehir<input className={`${field} ${err('city')}`} required value={form.city} onChange={set('city')} /></label>
        </div>
        <label className={label}>Adres<textarea className={`${field} min-h-20 py-2 ${err('address')}`} required value={form.address} onChange={set('address')} /></label>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#ead7a9]">Yetkili kişi ve giriş bilgileri</legend>
        <label className={label}>Ad soyad<input className={`${field} ${err('contactName')}`} required value={form.contactName} onChange={set('contactName')} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Telefon<input className={`${field} ${err('contactPhone')}`} required type="tel" value={form.contactPhone} onChange={set('contactPhone')} placeholder="05xx xxx xx xx" /></label>
          <label className={label}>E-posta (giriş adresi)<input className={`${field} ${err('contactEmail')}`} required type="email" value={form.contactEmail} onChange={set('contactEmail')} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Şifre<input className={`${field} ${err('password')}`} required type="password" autoComplete="new-password" value={form.password} onChange={set('password')} /></label>
          <label className={label}>Şifre (tekrar)<input className={`${field} ${err('password')}`} required type="password" autoComplete="new-password" value={form.passwordAgain} onChange={set('passwordAgain')} /></label>
        </div>
        <p className="text-xs text-white/50">En az 10 karakter; harf ve rakam içermeli.</p>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#ead7a9]">İlk kontör talebi (isteğe bağlı)</legend>
        <label className={label}>
          Kaç kişilik Ravza randevusu hakkı (kontör) istiyorsunuz?
          <input className={`${field} ${err('initialCredits')}`} type="number" min={0} inputMode="numeric" value={form.initialCredits} onChange={set('initialCredits')} placeholder="Örn. 500" />
        </label>
        <p className="text-xs text-white/50">1 kontör = 1 kişilik Ravza randevusu. Fiyat ve ödeme ekibimizle netleşir; onay sonrası hesabınıza yüklenir.</p>
      </fieldset>
      <label className="flex items-start gap-3 text-sm text-white/80">
        <input type="checkbox" className="mt-1 size-4" checked={form.termsAccepted} onChange={set('termsAccepted')} />
        <span>
          <Link href="/acente/kosullar" target="_blank" className="underline">Acente Kullanım Koşullarını</Link> ve{' '}
          <Link href="/aydinlatma" target="_blank" className="underline">KVKK aydınlatma metnini</Link> okudum, kabul ediyorum. Kontörlerin yalnız
          kendi yolcularım için kullanılacağını ve randevuların iade edilemediğini biliyorum.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-white/80">
        <input type="checkbox" className="mt-1 size-4" checked={form.disclaimerAccepted} onChange={set('disclaimerAccepted')} />
        <span>
          <Link href="/sorumluluk-reddi" target="_blank" className="underline">Sorumluluk Reddi Beyanını</Link> okudum, kabul ediyorum. Randevu veya QR
          kodunun girişi garanti etmediğini ve ziyaret kurallarının yetkili makamlarca belirlendiğini biliyorum.
        </span>
      </label>
      {error ? <p role="alert" className="rounded-xl bg-[#9f432b]/25 px-3 py-2 text-sm text-[#ffd7c9]">{error.text}</p> : null}
      <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d2b77b] font-semibold text-[#071c14] disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Başvuruyu gönder
      </button>
    </form>
  );
}
