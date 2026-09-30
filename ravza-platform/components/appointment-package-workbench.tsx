'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Star } from 'lucide-react';

import type {
  AppointmentPackageRecord,
  AppointmentPackageStatus,
} from '@/lib/appointment-packages';

const statusLabel: Record<AppointmentPackageStatus, string> = {
  draft: 'Taslak',
  published: 'Yayında',
  archived: 'Arşiv',
};

const errorLabel: Record<string, string> = {
  publish_requirements_missing:
    'Yayın için ad ve en az üç kapsam maddesi gerekir.',
  invalid_price: 'Fiyat pozitif bir tam sayı olmalı veya boş bırakılmalıdır.',
  invalid_person_count: 'Kişi sayısı 1 ile 500 arasında olmalıdır.',
  package_update_failed: 'Kayıt şu anda güncellenemiyor.',
  insufficient_role: 'Bu işlem için yetkiniz yok.',
};

export function AppointmentPackageWorkbench() {
  const [packages, setPackages] = useState<AppointmentPackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/appointment-packages', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<{
          packages: AppointmentPackageRecord[];
        }>;
      })
      .then((payload) => {
        setPackages(payload.packages);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(
    pkg: AppointmentPackageRecord,
    patch: {
      status?: AppointmentPackageStatus;
      highlight?: boolean;
      price?: string;
    },
  ) {
    setSavingCode(pkg.code);
    setError(null);
    const priceInput = patch.price ?? drafts[pkg.code];
    const priceMinor =
      priceInput === undefined
        ? pkg.pricePerPersonMinor
        : priceInput.trim() === ''
          ? null
          : Math.round(Number(priceInput.replace(',', '.')) * 100);

    try {
      const response = await fetch('/api/admin/appointment-packages', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: pkg.code,
          personCount: pkg.personCount,
          pricePerPersonMinor: priceMinor,
          status: patch.status ?? pkg.status,
          highlight: patch.highlight ?? pkg.highlight,
        }),
      });
      const payload = (await response.json()) as {
        packages?: AppointmentPackageRecord[];
        error?: string;
      };
      if (!response.ok) {
        setError(
          errorLabel[payload.error ?? ''] ?? 'Kayıt güncellenemedi.',
        );
        return;
      }
      if (payload.packages) setPackages(payload.packages);
    } catch {
      setError('Kayıt güncellenemedi.');
    } finally {
      setSavingCode(null);
    }
  }

  if (loading)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-24 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    );

  if (failed)
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-sm">
        <p className="font-medium">Paket listesi okunamıyor.</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 min-h-10 rounded-xl border border-border px-4 text-sm font-medium"
        >
          Tekrar dene
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Fiyatı boş bırakırsanız kart “Fiyat WhatsApp’tan teyit edilir”
        gösterir. Boş fiyatla yayımlamak geçerlidir; uydurma rakam yazmayın.
      </p>

      <ul className="space-y-3">
        {packages.map((pkg) => (
          <li
            key={pkg.code}
            className="rounded-2xl border border-black/5 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-xl">{pkg.name.tr}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pkg.code} · {pkg.personCount} kişi
                </p>
              </div>
              <span className="inline-flex items-center gap-2">
                {pkg.highlight ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)]/20 px-2.5 py-0.5 text-[0.7rem] font-medium text-[#6b5320]">
                    <Star className="size-3" /> Öne çıkan
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ${
                    pkg.status === 'published'
                      ? 'bg-[color:var(--success)]/12 text-[color:var(--success)]'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {statusLabel[pkg.status]}
                </span>
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor={`price-${pkg.code}`}
                  className="text-xs text-muted-foreground"
                >
                  Kişi başı fiyat (USD)
                </label>
                <input
                  id={`price-${pkg.code}`}
                  inputMode="decimal"
                  placeholder="boş = teyitli"
                  defaultValue={
                    pkg.pricePerPersonMinor === null
                      ? ''
                      : String(pkg.pricePerPersonMinor / 100)
                  }
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [pkg.code]: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-11 w-40 rounded-xl border border-border bg-white px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <button
                type="button"
                disabled={savingCode === pkg.code}
                onClick={() => save(pkg, {})}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {savingCode === pkg.code ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Fiyatı kaydet
              </button>
              <button
                type="button"
                disabled={savingCode === pkg.code}
                onClick={() =>
                  save(pkg, {
                    status: pkg.status === 'published' ? 'draft' : 'published',
                  })
                }
                className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
              >
                {pkg.status === 'published' ? 'Yayından kaldır' : 'Yayımla'}
              </button>
              <button
                type="button"
                disabled={savingCode === pkg.code}
                onClick={() => save(pkg, { highlight: !pkg.highlight })}
                className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
              >
                {pkg.highlight ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
