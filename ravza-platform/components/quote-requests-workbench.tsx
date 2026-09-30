'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarRange,
  Loader2,
  MessageCircle,
  Search,
  Users,
} from 'lucide-react';

import { QuoteRequestActions } from '@/components/quote-request-actions';
import { RawdahBookingPanel } from '@/components/rawdah-booking-panel';
import {
  nextStatuses,
  quotePipeline,
  type QuoteStatus,
} from '@/lib/quote-request';

type QuoteRequest = {
  id: string;
  code: string;
  service: string;
  packageCode: string;
  personCount: number;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  timePreference: string;
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
  status: QuoteStatus;
  assignedTo: string | null;
  quotedAmountMinor: number | null;
  paymentMethod: string | null;
  createdAt: number;
  updatedAt: number;
};

const statusLabel: Record<QuoteStatus, string> = {
  new: 'Yeni',
  contacted: 'Görüşüldü',
  quoted: 'Fiyat verildi',
  confirmed: 'Onaylandı',
  scheduled: 'Planlandı',
  qr_ready: 'QR hazır',
  delivered: 'Teslim edildi',
  closed: 'Kapatıldı',
  cancelled: 'İptal',
  expired: 'Süresi doldu',
};

const serviceLabel: Record<string, string> = {
  rawdah: 'Ravza randevusu',
  umrah: 'Umre paketi',
  bulk: 'Toplu / acente',
};

const timeLabel: Record<string, string> = {
  morning: 'Sabah',
  afternoon: 'Öğleden sonra',
  evening: 'Akşam',
  night: 'Gece',
  any: 'Fark etmez',
};

const filters: Array<QuoteStatus | 'all'> = [
  'all',
  ...quotePipeline,
  'cancelled',
];

function statusTone(status: QuoteStatus) {
  if (status === 'cancelled' || status === 'expired')
    return 'bg-muted text-muted-foreground';
  if (status === 'delivered' || status === 'closed')
    return 'bg-[color:var(--success)]/12 text-[color:var(--success)]';
  if (status === 'new') return 'bg-[color:var(--gold)]/20 text-[#6b5320]';
  return 'bg-primary/10 text-primary';
}

/**
 * Elle seçilebilen sonraki durumlar. Ravza taleplerinde "QR hazır" yalnız
 * gerçek QR bağlantısı oluşunca otomatik gelir; elle seçilirse müşteri QR'sız
 * "QR hazır" görürdü.
 */
function manualNext(request: QuoteRequest): QuoteStatus[] {
  return nextStatuses(request.status).filter(
    (status) => !(status === 'qr_ready' && request.service !== 'umrah'),
  );
}

export function QuoteRequestsWorkbench() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/quote-requests', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<{
          requests: QuoteRequest[];
          counts: Record<string, number>;
        }>;
      })
      .then((payload) => {
        setRequests(payload.requests);
        setCounts(payload.counts);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    return requests.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!needle) return true;
      return (
        item.code.toLocaleLowerCase('tr-TR').includes(needle) ||
        item.fullName.toLocaleLowerCase('tr-TR').includes(needle) ||
        item.phone.includes(needle)
      );
    });
  }, [requests, filter, search]);

  async function advance(target: QuoteStatus) {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/quote-requests', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: selected.code, status: target }),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        request: QuoteRequest;
        feedbackInviteUrl: string | null;
      };
      setSelected(payload.request);
      // Davet bağlantısı yalnız bu yanıtta gelir; kaçırılırsa yeniden
      // üretilemez, bu yüzden hemen gösterilir.
      if (payload.feedbackInviteUrl) {
        setInviteUrl(payload.feedbackInviteUrl);
        setInviteCopied(false);
      }
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Talep kodu, ad veya telefon"
            aria-label="Talep ara"
            className="min-h-11 w-full rounded-xl border border-border bg-white ps-9 pe-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="min-h-11 rounded-xl border border-border bg-white px-4 text-sm font-medium transition hover:bg-muted"
        >
          Yenile
        </button>
      </div>

      {notice ? (
        <output className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--success)]/10 px-4 py-2.5 text-sm text-[color:var(--success)]">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Kapat" className="text-xs underline">
            Kapat
          </button>
        </output>
      ) : null}

      <div className="premium-horizontal flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => {
          const total =
            item === 'all'
              ? Object.values(counts).reduce((sum, value) => sum + value, 0)
              : (counts[item] ?? 0);
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition ${
                filter === item
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-black/5 bg-white/75 text-foreground/65 hover:bg-white'
              }`}
            >
              {item === 'all' ? 'Tümü' : statusLabel[item]}
              <span className="tabular-nums opacity-70">{total}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-16 animate-pulse rounded-2xl bg-black/5"
            />
          ))}
        </div>
      ) : failed ? (
        <div className="rounded-2xl border border-border bg-white p-6 text-sm">
          <p className="font-medium">Talep listesi şu anda okunamıyor.</p>
          <p className="mt-1 text-muted-foreground">
            Bağlantı döndüğünde yenileyin. Bu sırada yeni talepler kaydedilmeye
            devam eder.
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-3 min-h-10 rounded-xl border border-border px-4 text-sm font-medium"
          >
            Tekrar dene
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
          <p className="font-serif text-xl">Bu filtrede talep yok.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Siteden gelen her talep, WhatsApp’a gidilmese bile buraya düşer.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="flex w-full items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 text-start transition hover:border-primary/30 hover:shadow-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${statusTone(item.status)}`}
                    >
                      {statusLabel[item.status]}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium">
                    {item.fullName}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {item.personCount} kişi ({item.femaleCount}K/
                      {item.maleCount}E)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange className="size-3" />
                      {item.dateFrom} – {item.dateTo}
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-[#071c14]/35"
            onClick={() => setSelected(null)}
            aria-hidden="true"
          />
          <aside
            aria-label={`Talep ${selected.code}`}
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted-foreground">
                  {selected.code}
                </p>
                <h3 className="mt-1 font-serif text-2xl">
                  {selected.fullName}
                </h3>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(selected.status)}`}
                >
                  {statusLabel[selected.status]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Kapat"
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            {selected.service !== 'umrah' ? (
              <div className="mt-6">
                <RawdahBookingPanel
                  key={selected.code}
                  code={selected.code}
                  femaleCount={selected.femaleCount}
                  maleCount={selected.maleCount}
                  dateFrom={selected.dateFrom}
                  status={selected.status}
                  onChanged={() => {
                    // Satın alma talebi “QR hazır”a taşıyabilir; liste ve seçili kayıt tazelenir.
                    fetch('/api/admin/quote-requests', { cache: 'no-store' })
                      .then(
                        (response) =>
                          (response.ok ? response.json() : null) as Promise<{
                            requests: QuoteRequest[];
                            counts: Record<string, number>;
                          } | null>,
                      )
                      .then((payload) => {
                        if (!payload) return;
                        setRequests(payload.requests);
                        setCounts(payload.counts);
                        const fresh = payload.requests.find((item) => item.code === selected.code);
                        if (fresh) setSelected(fresh);
                      })
                      .catch(() => undefined);
                  }}
                />
              </div>
            ) : null}
            <dl className="mt-6 space-y-3 text-sm">
              {[
                ['Hizmet', serviceLabel[selected.service] ?? selected.service],
                ['Kişi', `${selected.personCount} (${selected.femaleCount} kadın, ${selected.maleCount} erkek)`],
                [
                  'Tarih',
                  `${selected.dateFrom} – ${selected.dateTo}${selected.flexible ? ' · esnek' : ''}`,
                ],
                ['Saat tercihi', timeLabel[selected.timePreference] ?? '—'],
                ['Telefon', selected.phone],
                ['E-posta', selected.email ?? '—'],
                ['Not', selected.note ?? '—'],
                ['Sorumlu', selected.assignedTo ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-xs text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="text-end">{value}</dd>
                </div>
              ))}
            </dl>

            <a
              href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0a2e1f] px-5 text-sm font-medium text-white"
            >
              <MessageCircle className="size-4" />
              WhatsApp’tan yaz
            </a>

            <QuoteRequestActions
              key={`${selected.code}-${selected.updatedAt}`}
              request={selected}
              onUpdated={(updated) => {
                setSelected(updated);
                setRequests((current) => current.map((item) => (item.code === updated.code ? updated : item)));
              }}
              onDeleted={(code) => {
                setSelected(null);
                setRequests((current) => current.filter((item) => item.code !== code));
                setNotice(`${code} silindi.`);
                load();
              }}
            />


            <div className="mt-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Sonraki adım
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {manualNext(selected).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Bu talep tamamlandı.
                  </p>
                ) : (
                  manualNext(selected).map((target) => (
                    <button
                      key={target}
                      type="button"
                      disabled={saving}
                      onClick={() => advance(target)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      {statusLabel[target]}
                    </button>
                  ))
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Durum ilerletmek denetim kaydına yazılır. “Teslim edildi”
                seçildiğinde tek kullanımlık geri bildirim daveti açılır.
              </p>

              {inviteUrl ? (
                <div className="mt-4 rounded-xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-4">
                  <p className="text-xs font-medium">
                    Geri bildirim daveti hazır
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bu bağlantı bir kez gösterilir ve 14 gün geçerlidir.
                    Müşteriye WhatsApp veya e-posta ile siz iletirsiniz.
                  </p>
                  <code className="mt-2 block truncate rounded-lg bg-white/70 px-2 py-1.5 text-[0.7rem]">
                    {inviteUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(inviteUrl)
                        .then(() => setInviteCopied(true))
                        .catch(() => setInviteCopied(false));
                    }}
                    className="mt-2 min-h-10 rounded-lg border border-border bg-white px-3 text-xs font-medium"
                  >
                    {inviteCopied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
