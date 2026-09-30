'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import type { Metric, PeriodStats } from '@/lib/quote-stats';

/** Talep sütunları: marka yeşili. Tek seri olduğu için lejant yerine başlık adlandırır. */
const ACCENT = '#2e7550';
const ACCENT_HOVER = '#3f8f66';
/**
 * Durum dağılımı: boru hattı sıralı olduğu için tek tonlu (açık → koyu) yeşil,
 * iptal nötr gri. Komşu adımlar doğrulandı (normal görüş ΔE ≥ 18, CVD ≥ 17);
 * açık adımların düşük kontrastı lejant, ipucu ve tablo ile karşılanır.
 */
const STATUS_COLORS: Record<string, string> = {
  yeni: '#bfe0cb',
  gorusme: '#6fae88',
  onay: '#2e7550',
  qr: '#0f3b27',
  iptal: '#b3b8b0',
};
const GRID = '#e6eae3';

const nf = new Intl.NumberFormat('tr-TR');

function Delta({ metric, previousLabel }: { metric: Metric; previousLabel: string }) {
  if (metric.previous === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        {metric.value === 0 ? 'Henüz hareket yok' : `Önceki dönemde yoktu · ${previousLabel}`}
      </p>
    );
  }
  const change = Math.round(((metric.value - metric.previous) / metric.previous) * 100);
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const tone = change > 0 ? 'text-[color:var(--success)]' : change < 0 ? 'text-[#9f432b]' : 'text-muted-foreground';
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
        <Icon className="size-3.5" aria-hidden="true" />
        {change > 0 ? '+' : ''}
        {change}%
      </span>
      <span>
        ({nf.format(metric.previous)} → {nf.format(metric.value)}) {previousLabel}
      </span>
    </p>
  );
}

function StatTile({
  label,
  metric,
  previousLabel,
  sub,
  hero,
}: {
  label: string;
  metric: Metric;
  previousLabel: string;
  sub?: string;
  hero?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 font-semibold tracking-tight ${hero ? 'text-5xl' : 'text-3xl'}`}>
        {nf.format(metric.value)}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      <Delta metric={metric} previousLabel={previousLabel} />
    </div>
  );
}

/** Temiz eksen adımları: 0'dan başlayan tam sayılar. */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? power * 10;
  const safeStep = Math.max(1, Math.round(step));
  const top = Math.ceil(max / safeStep) * safeStep;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += safeStep) ticks.push(value);
  return ticks;
}

function ColumnChart({ stats, title }: { stats: PeriodStats; title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // İlk çizim dar başlar; kutu ölçülünce gerçek genişliğe büyür (taşma olmaz).
  const [width, setWidth] = useState(280);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const data = stats.series;
  const max = Math.max(0, ...data.map((item) => item.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const height = 220;
  const pad = { top: 16, right: 8, bottom: 26, left: 32 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const band = plotW / data.length;
  const barW = Math.max(3, Math.min(24, band - 2));
  const y = (value: number) => pad.top + plotH - (value / top) * plotH;
  // Etiketleri seyrek göster: çok sütunlu dönemlerde her n'incisi.
  const every = data.length > 20 ? 5 : data.length > 12 ? 3 : 1;
  const peakIndex = max > 0 ? data.findIndex((item) => item.value === max) : -1;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="min-w-0 rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Gelen talepler · {title}</h3>
          <p className="text-xs text-muted-foreground">
            Toplam {nf.format(total)} talep · sütunun üzerine gelin veya sekme tuşuyla gezin
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"
        >
          {showTable ? 'Grafiği göster' : 'Tablo olarak göster'}
        </button>
      </div>

      {showTable ? (
        <div className="mt-4 max-h-[260px] overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f5f0] text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">Zaman</th>
                <th scope="col" className="px-3 py-2 text-end font-medium">Talep</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.long} className="border-t border-border/70">
                  <td className="px-3 py-1.5">{item.long}</td>
                  <td className="px-3 py-1.5 text-end tabular-nums">{item.future ? '—' : nf.format(item.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative mt-4 w-full min-w-0 overflow-hidden">
          <svg width={width} height={height} className="block" aria-label={`Gelen talepler, ${title}: toplam ${total}`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
                <text x={pad.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                  {nf.format(tick)}
                </text>
              </g>
            ))}
            {data.map((item, index) => {
              const cx = pad.left + band * index + band / 2;
              const barH = item.value > 0 ? Math.max(2, y(0) - y(item.value)) : 0;
              const x = cx - barW / 2;
              const r = Math.min(4, barW / 2, barH);
              const topY = y(0) - barH;
              // Üst köşeler 4px yuvarlak, taban düz.
              const path =
                barH > 0
                  ? `M${x},${y(0)} V${topY + r} Q${x},${topY} ${x + r},${topY} H${x + barW - r} Q${x + barW},${topY} ${x + barW},${topY + r} V${y(0)} Z`
                  : '';
              return (
                <g key={item.long}>
                  {path ? <path d={path} fill={hover === index ? ACCENT_HOVER : ACCENT} /> : null}
                  {index === peakIndex && max > 0 ? (
                    <text x={cx} y={topY - 6} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                      {nf.format(item.value)}
                    </text>
                  ) : null}
                  {index % every === 0 || index === data.length - 1 ? (
                    <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                      {item.label}
                    </text>
                  ) : null}
                  {/* İsabet alanı sütundan geniş: tüm bant, klavye ile de odaklanır. */}
                  <rect
                    x={pad.left + band * index}
                    y={pad.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${item.long}: ${item.future ? 'henüz gelmedi' : `${item.value} talep`}`}
                    onPointerEnter={() => setHover(index)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                </g>
              );
            })}
            <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="#cfd5cb" strokeWidth={1} />
          </svg>
          {active && hover !== null ? (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-lg"
              style={{
                left: Math.min(width - 70, Math.max(70, pad.left + band * hover + band / 2)),
                top: 0,
              }}
            >
              <p className="text-base font-semibold">{active.future ? '—' : nf.format(active.value)}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: ACCENT }} />
                {active.long}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatusMix({ stats }: { stats: PeriodStats }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = stats.statusMix.reduce((sum, item) => sum + item.value, 0);
  const segments = stats.statusMix.filter((item) => item.value > 0);
  return (
    <div className="min-w-0 rounded-2xl border border-black/5 bg-white p-5">
      <h3 className="text-sm font-semibold">Talepler hangi aşamada?</h3>
      <p className="text-xs text-muted-foreground">Bu dönemde gelen {nf.format(total)} talebin bugünkü durumu</p>
      {total === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Bu dönemde talep yok.</p>
      ) : (
        <>
          <div className="relative mt-5 flex h-4 w-full gap-[2px]" aria-label="Durum dağılımı">
            {segments.map((item, index) => (
              <button
                type="button"
                key={item.key}
                aria-label={`${item.label}: ${item.value}`}
                onPointerEnter={() => setHover(item.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(item.key)}
                onBlur={() => setHover(null)}
                className="h-full outline-none transition-opacity"
                style={{
                  width: `${(item.value / total) * 100}%`,
                  minWidth: 4,
                  background: STATUS_COLORS[item.key],
                  opacity: hover && hover !== item.key ? 0.55 : 1,
                  borderTopLeftRadius: index === 0 ? 4 : 0,
                  borderBottomLeftRadius: index === 0 ? 4 : 0,
                  borderTopRightRadius: index === segments.length - 1 ? 4 : 0,
                  borderBottomRightRadius: index === segments.length - 1 ? 4 : 0,
                }}
              />
            ))}
          </div>
          <ul className="mt-5 grid gap-1">
            {stats.statusMix.map((item) => (
              <li
                key={item.key}
                className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm ${hover === item.key ? 'bg-[#f3f5f0]' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block size-3 rounded-[3px]" style={{ background: STATUS_COLORS[item.key] }} />
                  {item.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <strong className="font-semibold text-foreground">{nf.format(item.value)}</strong>{' '}
                  · %{total ? Math.round((item.value / total) * 100) : 0}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function PanelStats({
  stats,
  title,
  previousLabel,
}: {
  stats: PeriodStats;
  title: string;
  previousLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Yeni talep" metric={stats.requests} previousLabel={previousLabel} hero />
        <StatTile label="Onaylanan talep" metric={stats.confirmed} previousLabel={previousLabel} />
        <StatTile label="QR oluşturulan" metric={stats.qrReady} previousLabel={previousLabel} />
        <StatTile
          label="Ziyaretçi (kişi)"
          metric={stats.visitors}
          previousLabel={previousLabel}
          sub={`${nf.format(stats.visitors.female)} kadın · ${nf.format(stats.visitors.male)} erkek`}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ColumnChart stats={stats} title={title} />
        <StatusMix stats={stats} />
      </div>
    </div>
  );
}
