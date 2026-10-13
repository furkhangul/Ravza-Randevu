import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  DatabaseZap,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getExecutiveStats, type MoneyLine } from '@/lib/executive-stats';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const formatUsd = (minor: number) => usd.format(minor / 100);

function formatTime(ms: number) {
  return new Date(ms).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sum(...lines: MoneyLine[]): MoneyLine {
  return lines.reduce(
    (total, line) => ({
      amountMinor: total.amountMinor + line.amountMinor,
      count: total.count + line.count,
    }),
    { amountMinor: 0, count: 0 },
  );
}

const STATUS_LABEL = {
  purchasing: 'Yanıt bekleniyor',
  unknown: 'Sonuç belirsiz',
  failed: 'Başarısız',
} as const;

export async function ExecutiveOverview() {
  const stats = await getExecutiveStats();
  const { money, provider, queue, reconciliation } = stats;
  const providerOk = provider.balance !== null;

  const moneyCards = money
    ? [
        {
          label: 'Gerçekleşen gelir',
          line: sum(
            money.creditSales,
            money.confirmedQuotes,
            money.confirmedOrders,
          ),
          note: 'onaylı kayıt',
        },
        {
          label: 'Kontör satışı',
          line: money.creditSales,
          note: 'onaylı kontör talebi',
        },
        {
          label: 'Teklif + sipariş geliri',
          line: sum(money.confirmedQuotes, money.confirmedOrders),
          note: 'onaylı teklif / sipariş',
        },
        {
          label: 'Bekleyen tahsilat',
          line: sum(money.pendingQuotes, money.pendingOrders),
          note: 'cevap veya ödeme bekleyen',
        },
      ]
    : null;

  const todo = queue
    ? [
        {
          label: 'Acente başvurusu',
          value: queue.pendingAgencies,
          href: '/panel/yonetim?sekme=acenteler',
        },
        {
          label: 'Kontör talebi',
          value: queue.pendingCreditRequests,
          href: '/panel/kontor',
        },
        {
          label: 'Yeni müşteri talebi',
          value: queue.newQuotes,
          href: '/panel/talepler',
        },
        {
          label: 'Başarısız bildirim',
          value: queue.failedNotifications,
          href: null,
        },
      ]
    : null;

  return (
    <>
      <div className="relative mb-5 overflow-hidden rounded-[2rem] bg-[#071c14] p-7 text-white shadow-[0_24px_70px_rgba(7,28,20,.2)] sm:p-9">
        <div
          aria-hidden="true"
          className="absolute -top-20 right-0 size-72 rounded-full bg-[#c9a86a]/15 blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-[#e6ce98]">
              <Crown className="size-4" /> Yönetici kontrol kulesi
            </span>
            <h2 className="mt-5 max-w-2xl font-serif text-[clamp(2.3rem,4vw,4rem)] leading-[.95] tracking-[-.04em]">
              Para, operasyon ve risk aynı karar ekranında.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
              Tutarlar sistemdeki kayıtlardan USD olarak hesaplanır. Kalan
              randevu hakkı ve müsaitlik RawdahBooking&apos;den canlı okunur.
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-xs text-white/65">
            <span className="flex items-center gap-2">
              <Radio
                className={`size-4 ${providerOk ? 'text-emerald-300' : 'text-amber-300'}`}
              />
              {providerOk
                ? 'RawdahBooking bağlantısı: çalışıyor'
                : 'RawdahBooking okunamadı'}
            </span>
            <span className="text-white/45">
              Son güncelleme: {formatTime(stats.generatedAt)} · İstanbul
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {moneyCards ? (
          moneyCards.map(({ label, line, note }) => (
            <Card key={label} className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="font-serif text-3xl tabular-nums">
                  {formatUsd(line.amountMinor)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {line.count.toLocaleString('tr-TR')} {note}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 shadow-sm ring-1 ring-border sm:col-span-2 xl:col-span-4">
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                Finans verisi okunamadı
              </CardTitle>
              <CardDescription>
                Veritabanına şu anda ulaşılamıyor. Sayfayı yenileyerek tekrar
                deneyin.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-primary text-primary-foreground">
          <CardHeader>
            <CardDescription className="text-white/60">
              RawdahBooking · kalan randevu hakkı
            </CardDescription>
            <CardTitle className="font-serif text-5xl tabular-nums">
              {provider.balance !== null
                ? provider.balance.toLocaleString('tr-TR')
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/70">
            {providerOk
              ? 'Bağlı hesabın şu anki bakiyesi.'
              : 'Bakiye okunamadı. Hesap bilgilerini kontrol edin.'}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <Ticket className="size-6 text-primary" />
            <CardDescription>Sistemden alınan randevu</CardDescription>
            <CardTitle className="font-serif text-4xl tabular-nums">
              {provider.usedAppointments !== null
                ? provider.usedAppointments.toLocaleString('tr-TR')
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Acente ve müşteri talepleri için satın alınan kişi sayısı.
            {queue ? ` Aktif acente: ${queue.activeAgencies}.` : ''}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Bekleyen işler</CardTitle>
            <CardDescription>
              Karar veya müdahale bekleyen kayıtlar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {todo ? (
              todo.map(({ label, value, href }) => {
                const content = (
                  <>
                    <span>{label}</span>
                    <strong
                      className={
                        value > 0 ? 'text-[#9f432b]' : 'text-muted-foreground'
                      }
                    >
                      {value}
                    </strong>
                  </>
                );
                const className =
                  'flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2';
                return href ? (
                  <Link
                    key={label}
                    href={href}
                    className={`${className} hover:bg-muted`}
                  >
                    {content}
                  </Link>
                ) : (
                  <p key={label} className={className}>
                    {content}
                  </p>
                );
              })
            ) : (
              <p className="text-muted-foreground">Okunamadı.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="border-0 bg-white/80 shadow-[0_18px_55px_rgba(20,38,28,.07)] ring-1 ring-black/5 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="font-serif text-2xl">
                  Mutabakat kuyruğu
                </CardTitle>
                <CardDescription>
                  Sağlayıcı sonucu belirsiz, başarısız veya 10 dakikadır yanıt
                  bekleyen satın almalar.
                </CardDescription>
              </div>
              <DatabaseZap className="size-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {reconciliation === null ? (
              <p className="text-sm text-muted-foreground">
                Kayıtlar okunamadı.
              </p>
            ) : reconciliation.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-[#19613f]">
                <CheckCircle2 className="size-4" /> Bekleyen fark yok; tüm satın
                almalar sonuçlandı.
              </p>
            ) : (
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[.1em] text-muted-foreground">
                    <th className="pb-3 font-medium">Grup</th>
                    <th className="pb-3 font-medium">Kaynak</th>
                    <th className="pb-3 font-medium">Randevu</th>
                    <th className="pb-3 font-medium">Kişi</th>
                    <th className="pb-3 font-medium">Durum</th>
                    <th className="pb-3 font-medium">Son işlem</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.map((row) => (
                    <tr
                      key={`${row.source}-${row.id}`}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="py-4 font-mono text-xs">{row.label}</td>
                      <td className="py-4">
                        {row.source === 'agency' ? 'Acente' : 'Müşteri talebi'}
                      </td>
                      <td className="py-4">
                        {row.dateKey} · {row.timeSlot}
                      </td>
                      <td className="py-4">{row.quantity}</td>
                      <td className="py-4">
                        <Badge
                          variant="outline"
                          className={
                            row.status === 'failed'
                              ? 'border-[#c67755] text-[#9f432b]'
                              : 'border-[#c9a86a] text-[#715724]'
                          }
                          title={row.error ?? undefined}
                        >
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      </td>
                      <td className="py-4">{formatTime(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="border-0 bg-primary text-primary-foreground">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                <CardTitle className="font-serif text-xl">
                  Sistem anahtarları
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-primary-foreground/75">
              {stats.switches.map(({ label, on }) => (
                <p key={label} className="flex justify-between">
                  <span>{label}</span>
                  <strong>{on ? 'Açık' : 'Kapalı'}</strong>
                </p>
              ))}
            </CardContent>
          </Card>
          <Card className="border-0 bg-[#d8b873] text-[#071c14] shadow-lg ring-0">
            <CardHeader>
              <LockKeyhole className="size-7" />
              <CardTitle className="font-serif text-2xl">
                Umre paketi kapıları
              </CardTitle>
              <CardDescription className="text-[#071c14]/65">
                Paket satışı açılmadan önce doğrulanması gerekenler.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {stats.umrahGates.map(({ label, ready }) => (
                <p
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/35 p-3"
                >
                  <span>{label}</span>
                  <strong className="text-xs">
                    {ready ? 'Hazır' : 'Bekliyor'}
                  </strong>
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Bugün + yarın müsaitlik
            </CardTitle>
            <CardDescription>
              RawdahBooking&apos;den canlı; Medine saatine göre açık saatler ve
              boş kişi kapasitesi.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {provider.availability === null ? (
              <p className="text-sm text-muted-foreground">
                Müsaitlik okunamadı.
              </p>
            ) : (
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[.1em] text-muted-foreground">
                    <th className="pb-3 font-medium">Gün</th>
                    <th className="pb-3 font-medium">Grup</th>
                    <th className="pb-3 font-medium">Açık saat</th>
                    <th className="pb-3 font-medium">Boş yer</th>
                    <th className="pb-3 font-medium">İlk uygun</th>
                  </tr>
                </thead>
                <tbody>
                  {provider.availability.map((day) => (
                    <tr
                      key={`${day.dateKey}-${day.gender}`}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="py-4 font-medium">
                        {day.day === 'today' ? 'Bugün' : 'Yarın'}{' '}
                        <span className="text-xs text-muted-foreground">
                          {day.dateKey}
                        </span>
                      </td>
                      <td className="py-4">
                        {day.gender === 'female' ? 'Kadın' : 'Erkek'}
                      </td>
                      <td className="py-4">{day.openSlots}</td>
                      <td className="py-4 tabular-nums">
                        {day.capacity.toLocaleString('tr-TR')}
                        {day.capacityPlus ? '+' : ''}
                      </td>
                      <td className="py-4">
                        {day.firstWindow ? (
                          <Badge
                            variant="outline"
                            className="border-[#6c9c83] text-[#19613f]"
                          >
                            {day.firstWindow}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-[#c67755] text-[#9f432b]"
                          >
                            Yer yok
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        {reconciliation && reconciliation.length > 0 ? (
          <Card className="border-[#c67755]/35 bg-[#fff7f3]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-[#9f432b]" />
                <CardTitle className="font-serif text-xl">
                  Operasyon alarmı
                </CardTitle>
              </div>
              <CardDescription>
                {reconciliation.length} satın almanın sağlayıcı sonucu
                netleşmedi. Otomatik tekrar yapılmaz; RawdahBooking hesabından
                kontrol edin.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#19613f]" />
                <CardTitle className="font-serif text-xl">
                  Operasyon normal
                </CardTitle>
              </div>
              <CardDescription>
                Sonucu belirsiz satın alma yok.
                {queue && queue.queuedNotifications > 0
                  ? ` Gönderim sırasında ${queue.queuedNotifications} bildirim var.`
                  : ''}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </>
  );
}
