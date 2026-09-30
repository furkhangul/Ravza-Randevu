'use client';

import { useState, type SyntheticEvent } from 'react';
import Link from '@/components/safe-link';
import { CheckCircle2, Loader2, MailCheck, TriangleAlert } from 'lucide-react';

import { BrandMark } from '@/components/brand-mark';

const shellClass =
  'grid min-h-svh place-items-center bg-[#071c14] px-4 py-12 text-white';
const cardClass =
  'rounded-3xl border border-white/10 bg-white/[.05] p-6 backdrop-blur-xl sm:p-8';
const inputClass =
  'min-h-11 w-full rounded-xl border border-white/15 bg-white/8 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#d2b77b]';
const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-white/45';
const buttonClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d2b77b] text-sm font-semibold text-[#071c14] transition hover:bg-[#e6ce98] disabled:opacity-60';

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
        <BrandMark className="size-8" tone="onDark" />
      </span>
      <span>
        <span className="block font-serif text-2xl leading-none">
          Ravza Randevu
        </span>
        <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[.19em] text-white/40">
          {subtitle}
        </span>
      </span>
    </div>
  );
}

/** Adım 1: e-posta girip yenileme bağlantısı isteme. */
export function PasswordResetRequest() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) setSent(true);
      else setError('İstek gönderilemedi. Birazdan tekrar deneyin.');
    } catch {
      setError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={shellClass}>
      <div className="w-full max-w-md">
        <Header subtitle="Parola yenileme" />
        <div className={cardClass}>
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-10 text-[#d2b77b]" />
              <h1 className="mt-4 font-serif text-2xl">Bağlantı yolda</h1>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Bu adres kayıtlıysa parola yenileme bağlantısı birazdan
                gelecek. Gelen kutunuzu ve gereksiz posta klasörünü kontrol
                edin. Bağlantı 60 dakika geçerlidir.
              </p>
              <Link
                href="/admin"
                className="mt-6 inline-flex text-sm text-[#e6ce98] hover:text-white"
              >
                Giriş ekranına dön
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-2xl">Parolanızı mı unuttunuz?</h1>
              <p className="mt-3 mb-6 text-sm leading-6 text-white/60">
                Hesabınızın e-posta adresini yazın. Yeni parola belirlemeniz
                için tek kullanımlık bir bağlantı gönderelim.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className={labelClass}>E-posta adresi</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className={inputClass}
                    placeholder="ornek@ravzarandevu.com.tr"
                  />
                </label>
                {error ? (
                  <p
                    role="alert"
                    className="flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs leading-5 text-red-200"
                  >
                    <TriangleAlert className="mt-px size-4 shrink-0" />
                    {error}
                  </p>
                ) : null}
                <button type="submit" disabled={pending} className={buttonClass}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {pending ? 'Gönderiliyor…' : 'Yenileme bağlantısı gönder'}
                </button>
              </form>
              <Link
                href="/admin"
                className="mt-5 inline-flex text-sm text-white/45 hover:text-white"
              >
                Vazgeç, giriş ekranına dön
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/** Adım 2: bağlantıdaki jetonla yeni parola belirleme. */
export function PasswordResetConfirm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== repeat) {
      setErrors(['İki parola birbirini tutmuyor.']);
      return;
    }
    setPending(true);
    setErrors([]);
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        problems?: string[];
      };
      if (response.ok) {
        setDone(true);
        return;
      }
      if (body.problems?.length) setErrors(body.problems);
      else if (body.error === 'invalid_or_expired_token') {
        setErrors([
          'Bu bağlantının süresi dolmuş veya daha önce kullanılmış. Yeni bir bağlantı isteyin.',
        ]);
      } else setErrors(['Parola değiştirilemedi. Birazdan tekrar deneyin.']);
    } catch {
      setErrors(['Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.']);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={shellClass}>
      <div className="w-full max-w-md">
        <Header subtitle="Yeni parola" />
        <div className={cardClass}>
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
              <h1 className="mt-4 font-serif text-2xl">Parolanız değişti</h1>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Yeni parolanızla giriş yapabilirsiniz. Bu bağlantı artık
                geçersiz.
              </p>
              <Link href="/admin" className={`${buttonClass} mt-6`}>
                Giriş ekranına git
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <TriangleAlert className="mx-auto size-10 text-[#d2b77b]" />
              <h1 className="mt-4 font-serif text-2xl">Bağlantı eksik</h1>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Bu sayfaya e-postadaki bağlantıyla gelmeniz gerekiyor. Bağlantı
                bozulmuş olabilir; yenisini isteyin.
              </p>
              <Link href="/sifremi-unuttum" className={`${buttonClass} mt-6`}>
                Yeni bağlantı iste
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-2xl">Yeni parolanızı belirleyin</h1>
              <p className="mt-3 mb-6 text-sm leading-6 text-white/60">
                En az 12 karakter, içinde harf ve rakam olsun. Uzun bir cümle,
                karmaşık kısa bir paroladan daha güvenlidir.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className={labelClass}>Yeni parola</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Yeni parola (tekrar)</span>
                  <input
                    type="password"
                    value={repeat}
                    onChange={(event) => setRepeat(event.target.value)}
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                </label>
                {errors.length > 0 ? (
                  <ul
                    role="alert"
                    className="space-y-1 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs leading-5 text-red-200"
                  >
                    {errors.map((message) => (
                      <li key={message} className="flex gap-2">
                        <TriangleAlert className="mt-px size-4 shrink-0" />
                        {message}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button type="submit" disabled={pending} className={buttonClass}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {pending ? 'Kaydediliyor…' : 'Parolayı değiştir'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
