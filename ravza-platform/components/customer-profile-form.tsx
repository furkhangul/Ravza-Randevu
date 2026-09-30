'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { CheckCircle2, Loader2, TriangleAlert, UserRoundCog } from 'lucide-react';

type Profile = {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female' | '';
  nationality: string;
  passportNumber: string;
  residenceCountry: string;
  residenceCity: string;
  marketingOptIn: boolean;
  source: 'google' | 'manual';
};

const emptyProfile: Profile = {
  fullName: '',
  phone: '',
  birthDate: '',
  gender: '',
  nationality: '',
  passportNumber: '',
  residenceCountry: '',
  residenceCity: '',
  marketingOptIn: false,
  source: 'manual',
};

const fieldLabels: Record<string, string> = {
  fullName: 'Ad soyad',
  phone: 'Telefon',
  birthDate: 'Doğum tarihi',
  nationality: 'Uyruk',
  residenceCountry: 'Yaşadığınız ülke',
  residenceCity: 'Yaşadığınız şehir',
};

const inputClass =
  'min-h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm outline-none focus:border-primary';
const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground';

/**
 * Müşteri profili formu.
 *
 * Google ile girildiyse ad ve e-posta hazır gelir; seyahat için gereken
 * telefon, doğum tarihi, uyruk ve ikamet bilgileri Google'dan gelmediği için
 * müşteriden istenir. Eksik alanlar formun başında açıkça listelenir.
 */
export function CustomerProfileForm({ email }: { email: string }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [missing, setMissing] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving'>(
    'loading',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/customer/profile', { headers: { accept: 'application/json' } })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              profile?: Profile | null;
              missing?: string[];
            }>)
          : null,
      )
      .then((body) => {
        if (!active) return;
        if (body?.profile) setProfile({ ...emptyProfile, ...body.profile });
        if (Array.isArray(body?.missing)) setMissing(body.missing);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('ready');
      });
    return () => {
      active = false;
    };
  }, []);

  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage(null);
    setFailed(false);
    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const body = (await response.json().catch(() => ({}))) as {
        profile?: Profile;
        missing?: string[];
        error?: string;
      };
      if (!response.ok) {
        setFailed(true);
        setMessage(
          body.error === 'invalid_birth_date'
            ? 'Doğum tarihi geçerli ve geçmiş bir tarih olmalı.'
            : 'Profil kaydedilemedi. Birazdan tekrar deneyin.',
        );
        return;
      }
      if (body.profile) setProfile({ ...emptyProfile, ...body.profile });
      setMissing(body.missing ?? []);
      setMessage(
        (body.missing ?? []).length === 0
          ? 'Profiliniz eksiksiz. Rezervasyon adımlarında bilgiler otomatik dolacak.'
          : 'Kaydedildi. Kalan alanları da doldurduğunuzda profil tamamlanır.',
      );
    } catch {
      setFailed(true);
      setMessage('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setStatus((current) => (current === 'saving' ? 'ready' : current));
    }
  }

  if (status === 'loading') {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Profil bilgileri yükleniyor…
      </p>
    );
  }

  return (
    <form
      onSubmit={save}
      className="rounded-3xl border border-border bg-white p-5 sm:p-7"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <UserRoundCog className="size-5" />
        </span>
        <div>
          <h2 className="font-serif text-xl tracking-[-.02em]">
            Kişisel bilgiler
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hesap e-postası: <strong className="font-medium">{email}</strong>
            {profile.source === 'google'
              ? ' · Google hesabınızdan alındı'
              : null}
          </p>
        </div>
      </div>

      {missing.length > 0 ? (
        <p className="mb-5 flex gap-2 rounded-xl border border-[#d7c9ae] bg-[#f8f3e8] p-3.5 text-xs leading-5 text-[#5c4a22]">
          <TriangleAlert className="mt-px size-4 shrink-0 text-[#9f432b]" />
          <span>
            Rezervasyon açabilmek için şu alanlar gerekli:{' '}
            <strong className="font-semibold">
              {missing.map((key) => fieldLabels[key] ?? key).join(', ')}
            </strong>
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Ad soyad</span>
          <input
            className={inputClass}
            value={profile.fullName}
            onChange={(event) => field('fullName', event.target.value)}
            autoComplete="name"
            placeholder="Pasaportta yazdığı gibi"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Telefon</span>
          <input
            className={inputClass}
            value={profile.phone}
            onChange={(event) => field('phone', event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+90 5xx xxx xx xx"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Doğum tarihi</span>
          <input
            className={inputClass}
            type="date"
            value={profile.birthDate}
            onChange={(event) => field('birthDate', event.target.value)}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Cinsiyet</span>
          <select
            className={inputClass}
            value={profile.gender}
            onChange={(event) =>
              field('gender', event.target.value as Profile['gender'])
            }
          >
            <option value="">Belirtmek istemiyorum</option>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Uyruk</span>
          <input
            className={inputClass}
            value={profile.nationality}
            onChange={(event) => field('nationality', event.target.value)}
            placeholder="Türkiye"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Yaşadığınız ülke</span>
          <input
            className={inputClass}
            value={profile.residenceCountry}
            onChange={(event) => field('residenceCountry', event.target.value)}
            autoComplete="country-name"
            placeholder="Türkiye"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Yaşadığınız şehir</span>
          <input
            className={inputClass}
            value={profile.residenceCity}
            onChange={(event) => field('residenceCity', event.target.value)}
            autoComplete="address-level2"
            placeholder="İstanbul"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Pasaport numarası (isteğe bağlı)</span>
          <input
            className={inputClass}
            value={profile.passportNumber}
            onChange={(event) => field('passportNumber', event.target.value)}
            placeholder="U12345678"
          />
          <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
            Şimdi girmek zorunda değilsiniz. Vize adımına gelindiğinde
            istenecek; erken girerseniz form kendiliğinden dolar.
          </span>
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={profile.marketingOptIn}
          onChange={(event) => field('marketingOptIn', event.target.checked)}
        />
        <span className="text-muted-foreground">
          Yeni umre dönemleri ve kontenjan açılışları için bilgilendirme almak
          istiyorum. İstediğiniz an kapatabilirsiniz.
        </span>
      </label>

      {message ? (
        <output
          className={`mt-5 flex gap-2 rounded-xl p-3.5 text-xs leading-5 ${failed ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-emerald-200 bg-emerald-50 text-emerald-900'}`}
        >
          {failed ? (
            <TriangleAlert className="mt-px size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-px size-4 shrink-0" />
          )}
          {message}
        </output>
      ) : null}

      <button
        type="submit"
        disabled={status === 'saving'}
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:bg-[#123d2b] disabled:opacity-60"
      >
        {status === 'saving' ? <Loader2 className="size-4 animate-spin" /> : null}
        {status === 'saving' ? 'Kaydediliyor…' : 'Profili kaydet'}
      </button>
    </form>
  );
}
