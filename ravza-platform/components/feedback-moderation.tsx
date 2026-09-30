'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Star } from 'lucide-react';

import {
  averageRating,
  ratingDistribution,
  type FeedbackRecord,
  type FeedbackStatus,
} from '@/lib/feedback';

const statusLabel: Record<FeedbackStatus, string> = {
  pending: 'Beklemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
};

export function FeedbackModeration() {
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/feedback', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<{ feedback: FeedbackRecord[] }>;
      })
      .then((payload) => {
        setItems(payload.feedback);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const published = useMemo(
    () => items.filter((item) => item.status === 'published'),
    [items],
  );
  const average = averageRating(published.map((item) => item.rating));
  const distribution = ratingDistribution(published.map((item) => item.rating));

  async function moderate(
    id: string,
    status: FeedbackStatus,
    extra: { rejectReason?: string; reply?: string } = {},
  ) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status, ...extra }),
      });
      const payload = (await response.json()) as {
        feedback?: FeedbackRecord[];
        error?: string;
      };
      if (!response.ok) {
        setError(
          payload.error === 'reject_reason_required'
            ? 'Reddetmek için kısa bir gerekçe yazın.'
            : 'İşlem tamamlanamadı.',
        );
        return;
      }
      if (payload.feedback) setItems(payload.feedback);
    } catch {
      setError('İşlem tamamlanamadı.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading)
    return (
      <div className="space-y-2">
        {[0, 1].map((row) => (
          <div key={row} className="h-28 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    );

  if (failed)
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-sm">
        <p className="font-medium">Geri bildirim listesi okunamıyor.</p>
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
    <div className="space-y-5">
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <p className="text-xs text-muted-foreground">
            Yayındaki ortalama
          </p>
          <p className="mt-2 font-serif text-3xl tabular-nums">
            {average ?? '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {published.length} yayınlanmış değerlendirme
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Puan dağılımı</p>
          <div className="mt-3 space-y-1.5">
            {[5, 4, 3, 2, 1].map((score) => {
              const count = distribution[score];
              const width =
                published.length > 0 ? (count / published.length) * 100 : 0;
              return (
                <div key={score} className="flex items-center gap-2 text-xs">
                  <span className="w-3 tabular-nums">{score}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                    <span
                      className="block h-full rounded-full bg-[color:var(--gold)]"
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className="w-6 text-end tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
          <p className="font-serif text-xl">Henüz değerlendirme yok.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Davetler yalnız “Teslim edildi” durumuna taşınan taleplere gider.
            Buraya gerçek yorum düşene kadar sitede yorum bölümü görünmez.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-black/5 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (unused, index) => (
                      <Star
                        key={index}
                        aria-hidden="true"
                        className={`size-4 ${
                          index < item.rating
                            ? 'fill-[color:var(--gold)] text-[color:var(--gold)]'
                            : 'text-black/15'
                        }`}
                      />
                    ))}
                    <span className="ms-2 text-sm font-medium">
                      {item.displayName}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.quoteCode ?? '—'} ·{' '}
                    {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ${
                    item.status === 'published'
                      ? 'bg-[color:var(--success)]/12 text-[color:var(--success)]'
                      : item.status === 'rejected'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-[color:var(--gold)]/20 text-[#6b5320]'
                  }`}
                >
                  {statusLabel[item.status]}
                </span>
              </div>

              {item.body ? (
                <p className="mt-3 text-sm leading-6">{item.body}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Yalnız puan verildi, yorum yazılmadı.
                </p>
              )}

              {item.businessReply ? (
                <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
                  <strong className="block text-xs text-muted-foreground">
                    İşletme yanıtı
                  </strong>
                  {item.businessReply}
                </p>
              ) : null}

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <input
                  aria-label="İşletme yanıtı"
                  placeholder="İşletme yanıtı (isteğe bağlı)"
                  value={replies[item.id] ?? ''}
                  onChange={(event) =>
                    setReplies((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                />
                <input
                  aria-label="Red gerekçesi"
                  placeholder="Red gerekçesi (reddederken zorunlu)"
                  value={reasons[item.id] ?? ''}
                  onChange={(event) =>
                    setReasons((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() =>
                    moderate(item.id, 'published', {
                      reply: replies[item.id],
                    })
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {busyId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Yayımla
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() =>
                    moderate(item.id, 'rejected', {
                      rejectReason: reasons[item.id],
                    })
                  }
                  className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
                >
                  Reddet
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
