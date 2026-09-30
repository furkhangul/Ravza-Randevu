/**
 * Panel "Arayüz" istatistikleri: gün, hafta, ay ve yıl dönemleri.
 *
 * Dönemler İstanbul takvimine göredir (UTC+3, yaz saati yok): "Gün" bugün
 * 00:00'dan şimdiye, "Hafta" pazartesiden, "Ay" ayın 1'inden, "Yıl" 1 Ocak'tan.
 * Karşılaştırma, önceki dönemin aynı uzunluktaki başıyla yapılır (bu ayın
 * ilk 25 günü ↔ geçen ayın ilk 25 günü); böylece yarım dönem tam dönemle
 * kıyaslanıp yanıltıcı düşüş göstermez.
 */

export type StatsPeriod = 'gun' | 'hafta' | 'ay' | 'yil';
export const STATS_PERIODS: StatsPeriod[] = ['gun', 'hafta', 'ay', 'yil'];

export const PERIOD_LABEL: Record<StatsPeriod, string> = {
  gun: 'Gün',
  hafta: 'Hafta',
  ay: 'Ay',
  yil: 'Yıl',
};

export const PERIOD_TITLE: Record<StatsPeriod, string> = {
  gun: 'Bugün',
  hafta: 'Bu hafta',
  ay: 'Bu ay',
  yil: 'Bu yıl',
};

export const PREVIOUS_LABEL: Record<StatsPeriod, string> = {
  gun: 'dünün aynı saatine göre',
  hafta: 'geçen haftanın aynı gününe göre',
  ay: 'geçen ayın aynı gününe göre',
  yil: 'geçen yılın aynı gününe göre',
};

const OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function parsePeriod(value: unknown): StatsPeriod {
  return STATS_PERIODS.includes(value as StatsPeriod) ? (value as StatsPeriod) : 'gun';
}

/** İstanbul yerel saatindeki takvim alanları (UTC alanlarıyla okunur). */
function local(ms: number) {
  return new Date(ms + OFFSET_MS);
}

/** İstanbul yerel tarihinden UTC milisaniye. */
function fromLocal(year: number, month: number, day = 1, hour = 0) {
  return Date.UTC(year, month, day, hour) - OFFSET_MS;
}

export type Bucket = { label: string; long: string; start: number; end: number };
export type PeriodRange = {
  start: number;
  end: number;
  previousStart: number;
  previousEnd: number;
  buckets: Bucket[];
};

export function periodRange(period: StatsPeriod, now: number): PeriodRange {
  const t = local(now);
  const year = t.getUTCFullYear();
  const month = t.getUTCMonth();
  const day = t.getUTCDate();
  let start: number;
  let previousStart: number;
  const buckets: Bucket[] = [];

  if (period === 'gun') {
    start = fromLocal(year, month, day);
    previousStart = start - DAY;
    for (let hour = 0; hour < 24; hour += 1) {
      const label = String(hour).padStart(2, '0');
      buckets.push({ label, long: `${label}:00–${label}:59`, start: start + hour * HOUR, end: start + (hour + 1) * HOUR });
    }
  } else if (period === 'hafta') {
    const weekday = (t.getUTCDay() + 6) % 7; // pazartesi = 0
    start = fromLocal(year, month, day - weekday);
    previousStart = start - 7 * DAY;
    for (let index = 0; index < 7; index += 1) {
      const bucketStart = start + index * DAY;
      const date = local(bucketStart);
      buckets.push({
        label: WEEKDAYS[index],
        long: `${WEEKDAYS[index]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`,
        start: bucketStart,
        end: bucketStart + DAY,
      });
    }
  } else if (period === 'ay') {
    start = fromLocal(year, month, 1);
    previousStart = fromLocal(year, month - 1, 1);
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let date = 1; date <= days; date += 1) {
      const bucketStart = fromLocal(year, month, date);
      buckets.push({ label: String(date), long: `${date} ${MONTHS[month]}`, start: bucketStart, end: bucketStart + DAY });
    }
  } else {
    start = fromLocal(year, 0, 1);
    previousStart = fromLocal(year - 1, 0, 1);
    for (let index = 0; index < 12; index += 1) {
      buckets.push({
        label: MONTHS[index],
        long: `${MONTHS[index]} ${year}`,
        start: fromLocal(year, index, 1),
        end: fromLocal(year, index + 1, 1),
      });
    }
  }

  return { start, end: now, previousStart, previousEnd: previousStart + (now - start), buckets };
}

export type StatsQuote = {
  createdAt: number;
  status: string;
  personCount: number;
  femaleCount: number;
  maleCount: number;
};
export type StatsEvent = { toStatus: string; createdAt: number };

/** Durum dağılımı grupları: boru hattı sırasıyla, en sonda iptal. */
export const STATUS_GROUPS = [
  { key: 'yeni', label: 'Yeni', statuses: ['new'] },
  { key: 'gorusme', label: 'Görüşmede', statuses: ['contacted', 'quoted'] },
  { key: 'onay', label: 'Onaylandı', statuses: ['confirmed', 'scheduled'] },
  { key: 'qr', label: 'QR hazır / teslim', statuses: ['qr_ready', 'delivered', 'closed'] },
  { key: 'iptal', label: 'İptal / süresi doldu', statuses: ['cancelled', 'expired'] },
] as const;

export type Metric = { value: number; previous: number };

export type PeriodStats = {
  period: StatsPeriod;
  requests: Metric;
  confirmed: Metric;
  qrReady: Metric;
  visitors: Metric & { female: number; male: number };
  series: Array<{ label: string; long: string; value: number; future: boolean }>;
  statusMix: Array<{ key: string; label: string; value: number }>;
};

const within = (ms: number, from: number, to: number) => ms >= from && ms < to;

export function computeStats(
  period: StatsPeriod,
  quotes: StatsQuote[],
  events: StatsEvent[],
  now: number,
): PeriodStats {
  const range = periodRange(period, now);
  const current = quotes.filter((quote) => within(quote.createdAt, range.start, range.end + 1));
  const previous = quotes.filter((quote) => within(quote.createdAt, range.previousStart, range.previousEnd + 1));
  const countEvents = (status: string, from: number, to: number) =>
    events.filter((event) => event.toStatus === status && within(event.createdAt, from, to + 1)).length;
  const sum = (list: StatsQuote[], key: 'personCount' | 'femaleCount' | 'maleCount') =>
    list.reduce((total, quote) => total + (quote[key] || 0), 0);

  return {
    period,
    requests: { value: current.length, previous: previous.length },
    confirmed: {
      value: countEvents('confirmed', range.start, range.end),
      previous: countEvents('confirmed', range.previousStart, range.previousEnd),
    },
    qrReady: {
      value: countEvents('qr_ready', range.start, range.end),
      previous: countEvents('qr_ready', range.previousStart, range.previousEnd),
    },
    visitors: {
      value: sum(current, 'personCount'),
      previous: sum(previous, 'personCount'),
      female: sum(current, 'femaleCount'),
      male: sum(current, 'maleCount'),
    },
    series: range.buckets.map((bucket) => ({
      label: bucket.label,
      long: bucket.long,
      value: current.filter((quote) => within(quote.createdAt, bucket.start, bucket.end)).length,
      future: bucket.start > now,
    })),
    statusMix: STATUS_GROUPS.map((group) => ({
      key: group.key,
      label: group.label,
      value: current.filter((quote) => (group.statuses as readonly string[]).includes(quote.status)).length,
    })),
  };
}
