'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/safe-link';

const STORAGE_KEY = 'ravza-analytics-consent';

type Consent = 'granted' | 'denied';

function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Çerez onayı ve Google Analytics yükleyicisi.
 *
 * Ölçüm kimliği yoksa hiçbir şey gösterilmez ve hiçbir script yüklenmez.
 * Analitik yalnız kullanıcı açıkça onay verdikten sonra çalışır; reddetme
 * seçeneği kabul ile aynı görünürlüktedir (KVKK ve çerez politikası gereği).
 */
export function AnalyticsConsent({ measurementId }: { measurementId: string }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConsent(readConsent());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Onay verildiğinde GA4 betiği bir kez enjekte edilir.
  useEffect(() => {
    if (!measurementId || consent !== 'granted') return;
    if (document.getElementById('ga4-loader')) return;

    const script = document.createElement('script');
    script.id = 'ga4-loader';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);

    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    function gtag(...args: unknown[]) {
      w.dataLayer?.push(args);
    }
    gtag('js', new Date());
    // IP anonimleştirme ve reklam sinyalleri kapalı: yalnız site kullanımı.
    gtag('config', measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }, [consent, measurementId]);

  function choose(value: Consent) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Depolama kapalıysa tercih yalnız bu oturum için geçerli olur.
    }
    setConsent(value);
  }

  if (!measurementId || !ready || consent !== null) return null;

  return (
    <aside
      aria-label="Çerez tercihi"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-border bg-white/97 p-5 shadow-[0_1.2rem_3rem_rgba(20,38,28,.22)] backdrop-blur-xl sm:inset-x-6 sm:bottom-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          Siteyi geliştirebilmek için isteğe bağlı kullanım istatistikleri
          toplamak istiyoruz. Reddetseniz de site tam olarak çalışır.{' '}
          <Link href="/cerez-politikasi" className="font-medium text-primary underline">
            Çerez politikası
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium transition hover:bg-muted sm:flex-none"
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-[#123d2b] sm:flex-none"
          >
            Kabul et
          </button>
        </div>
      </div>
    </aside>
  );
}
