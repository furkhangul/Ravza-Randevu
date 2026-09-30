'use client';

import { useState } from 'react';
import { Check, Loader2, Star } from 'lucide-react';

const subRatings = [
  ['ratingCommunication', 'İletişim hızı'],
  ['ratingClarity', 'Netlik'],
  ['ratingTimeliness', 'Zamanında teslim'],
] as const;

const nameModes = [
  ['full', 'Tam adım'],
  ['initials', 'Baş harflerim'],
  ['anonymous', 'Anonim'],
] as const;

export function FeedbackForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0);
  const [details, setDetails] = useState<Record<string, number>>({});
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<'full' | 'initials' | 'anonymous'>(
    'initials',
  );
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (rating === 0) {
      setError('Lütfen bir puan seçin.');
      return;
    }
    if (!consent) {
      setError('Yayın izni vermeden değerlendirme kaydedilemez.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          rating,
          ...details,
          body,
          displayNameMode: mode,
          publishConsent: true,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Değerlendirme kaydedilemedi.');
        return;
      }
      setDone(true);
    } catch {
      setError('Değerlendirme kaydedilemedi.');
    } finally {
      setPending(false);
    }
  }

  if (done)
    return (
      <div className="rounded-2xl border border-gold/40 bg-gold-soft/25 p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[color:var(--success)] text-white">
          <Check className="size-6" />
        </span>
        <h2 className="mt-4 font-heading text-2xl">Teşekkür ederiz</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Değerlendirmeniz alındı. Yayımlanmadan önce ekibimiz okuyacak;
          yayımlandığında adınız seçtiğiniz biçimde görünecek.
        </p>
      </div>
    );

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <fieldset>
        <legend className="text-sm font-medium">Genel deneyiminiz</legend>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setRating(score)}
              aria-label={`${score} yıldız`}
              aria-pressed={rating === score}
              className="grid size-12 place-items-center rounded-xl transition hover:bg-muted"
            >
              <Star
                className={`size-7 ${
                  score <= rating
                    ? 'fill-[color:var(--gold)] text-[color:var(--gold)]'
                    : 'text-black/20'
                }`}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">
          Ayrıntılar (isteğe bağlı)
        </legend>
        <div className="mt-3 space-y-3">
          {subRatings.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="flex gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    aria-label={`${label} ${score}`}
                    onClick={() =>
                      setDetails((current) => ({ ...current, [key]: score }))
                    }
                    className="grid size-9 place-items-center rounded-lg transition hover:bg-muted"
                  >
                    <Star
                      className={`size-4 ${
                        score <= (details[key] ?? 0)
                          ? 'fill-[color:var(--gold)] text-[color:var(--gold)]'
                          : 'text-black/15'
                      }`}
                    />
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="feedback-body" className="text-sm font-medium">
          Yorumunuz (isteğe bağlı)
        </label>
        <textarea
          id="feedback-body"
          rows={4}
          maxLength={600}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Süreç nasıl geçti? Nerede zorlandınız?"
          className="mt-2 w-full rounded-xl border border-input bg-transparent p-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {body.length} / 600
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Adım nasıl görünsün?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {nameModes.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`min-h-11 rounded-xl border px-4 text-sm transition ${
                mode === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 size-4 accent-[color:var(--ravza-green)]"
        />
        <span>
          Değerlendirmemin sitede yayımlanmasına izin veriyorum. Yayımlanmadan
          önce ekip tarafından incelenecektir.
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Değerlendirmeyi gönder
      </button>
    </div>
  );
}
