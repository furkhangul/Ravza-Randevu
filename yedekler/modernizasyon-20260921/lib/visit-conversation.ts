import { isValidIsoDate } from './date-validation.ts';
import type { TimePreference } from './quote-request.ts';

/** Local, deterministic conversation. Never books a slot or invents availability. */
export type VisitDetails = {
  personCount: number | null;
  femaleCount: number | null;
  maleCount: number | null;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  timePreference: TimePreference;
};
export const emptyVisit: VisitDetails = {
  personCount: null, femaleCount: null, maleCount: null,
  dateFrom: '', dateTo: '', flexible: false, timePreference: 'any',
};
export type VisitStage = 'people' | 'distribution' | 'dates' | 'ready';
export type ConversationReply = {
  details: VisitDetails; text: string; suggestions: string[];
  link?: { href: string; label: string };
};

export function visitStage(value: VisitDetails): VisitStage {
  if (!value.personCount) return 'people';
  if (value.femaleCount === null || value.maleCount === null || value.femaleCount + value.maleCount !== value.personCount) return 'distribution';
  if (!value.dateFrom || !value.dateTo) return 'dates';
  return 'ready';
}

export function visitPrompt(value: VisitDetails): string {
  switch (visitStage(value)) {
    case 'people': return 'Kaç kişi için Ravza ziyareti planlıyorsunuz?';
    case 'distribution': return `${value.personCount} kişi için kadın ve erkek sayısını ayrı yazabilir misiniz? Ziyaret saatlerini buna göre değerlendireceğiz.`;
    case 'dates': return 'Medine’de hangi tarihlerde olacaksınız? Örneğin “1–5 Ekim 2026”. Tek gün de belirtebilirsiniz.';
    case 'ready': return 'Ziyaret bilgileri tamam. “Talep formuna aktar” ile bilgilerinizi kontrol edip iletişim bilgilerinizi ekleyebilirsiniz. Talebiniz ancak formu onaylayıp gönderdiğinizde kaydedilir.';
  }
}

export function visitSuggestions(value: VisitDetails): string[] {
  switch (visitStage(value)) {
    case 'people': return ['Tek kişiyim', '5 kişiyiz', 'Randevu nasıl alınır?'];
    case 'distribution': return ['Hepimiz kadınız', 'Hepimiz erkeğiz', 'Neden ayrı soruluyor?'];
    case 'dates': return ['Yarın', 'Tarihleri henüz bilmiyorum', 'Randevu garantili mi?'];
    case 'ready': return ['Bilgilerimi özetle', 'Ücret nasıl belirleniyor?', 'Yeni baştan başlayalım'];
  }
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('tr-TR').replace(/[ıİ]/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[–—]/g, '-');
}
function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function localToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
}
export function validateVisitDates(from: string, to: string, today = localToday()): string | null {
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) return 'Geçerli bir başlangıç ve bitiş tarihi yazın.';
  if (from < today) return 'Bu tarih geçmişte kalıyor. Medine’de bulunacağınız güncel tarihleri yazabilir misiniz?';
  if (to < from) return 'Bitiş tarihi başlangıçtan önce olamaz. Tarih aralığını yeniden yazabilir misiniz?';
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 60) return 'En fazla 60 günlük bir ziyaret aralığı belirtebilirsiniz. Aralığı daraltabilir misiniz?';
  return null;
}

const monthNames = ['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
function extractDates(message: string, today: string): { from: string; to: string } | null {
  const explicit = [...message.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g)]
    .map(m => m[1] ? iso(+m[1], +m[2], +m[3]) : iso(+m[6], +m[5], +m[4]));
  if (explicit.length) return { from: explicit[0], to: explicit[1] ?? explicit[0] };
  const named = new RegExp(`\\b(\\d{1,2})(?:\\s*(?:-|ile)\\s*(\\d{1,2}))?\\s+(${monthNames.join('|')})(?:\\s+(20\\d{2}))?`, 'g');
  const matches = [...message.matchAll(named)];
  if (matches.length) {
    // A trailing year applies to both dates (e.g. 30 Eylül - 3 Ekim 2027).
    const year = +(matches.find(m => m[4])?.[4] ?? today.slice(0, 4));
    const first = matches[0]; const last = matches[matches.length - 1];
    return { from: iso(+(first[4] ?? year), monthNames.indexOf(first[3]) + 1, +first[1]), to: iso(+(last[4] ?? year), monthNames.indexOf(last[3]) + 1, +(last[2] ?? last[1])) };
  }
  if (/\b(yarin|bugun)\b/.test(message)) {
    const date = new Date(`${today}T12:00:00Z`);
    if (/\byarin\b/.test(message)) date.setUTCDate(date.getUTCDate() + 1);
    const value = date.toISOString().slice(0, 10);
    return { from: value, to: value };
  }
  return null;
}
const numberWords: Record<string, number> = { sifir:0, bir:1, iki:2, uc:3, dort:4, bes:5, alti:6, yedi:7, sekiz:8, dokuz:9, on:10, yirmi:20, otuz:30, kirk:40, elli:50 };
function numericWords(value: string) {
  return value.replace(/\b(on|yirmi|otuz|kirk|elli)(?:\s+(bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz))?\b|\b(sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz)\b/g, (_, tens, unit, single) => String(single ? numberWords[single] : numberWords[tens] + (numberWords[unit] ?? 0)));
}
function countBeforeOrAfter(message: string, noun: string): number | null {
  const match = message.match(new RegExp(`\\b(\\d+)\\s*(?:tane\\s+)?(?:${noun})`)) ?? message.match(new RegExp(`(?:${noun})\\s*:?\\s*(\\d+)\\b`));
  return match ? Number(match[1]) : null;
}
export function visitSummary(details: VisitDetails) {
  const parts: string[] = [];
  if (details.personCount) parts.push(`${details.personCount} kişi`);
  if (details.femaleCount !== null) parts.push(`${details.femaleCount} kadın`);
  if (details.maleCount !== null) parts.push(`${details.maleCount} erkek`);
  if (details.dateFrom) {
    const format = (d: string) => new Intl.DateTimeFormat('tr-TR', { day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(`${d}T12:00:00Z`));
    parts.push(details.dateFrom === details.dateTo ? format(details.dateFrom) : `${format(details.dateFrom)} – ${format(details.dateTo)}`);
  }
  if (details.flexible) parts.push('Belirtilen aralıkta esnek');
  return parts.join(' · ');
}

const knowledge: Array<{ pattern: RegExp; answer: string; link?: ConversationReply['link'] }> = [
  { pattern: /fiyat|ucret|odeme|kac (?:tl|lira|dolar)|ne kadar|pahali/, answer: 'Hizmet bedeli kişi sayısı ve talebin kapsamına göre ekip tarafından teyit edilir. Site üzerinden ödeme alınmaz; kart bilgisi istemiyoruz. Talep göndermek, randevunun kesinleştiği anlamına gelmez.', link: { href:'/paketler', label:'Paketleri incele' } },
  { pattern: /garanti|kesin|musait|uygunluk|kontenjan|yer var|bos yer/, answer: 'Canlı kontenjanı bu sohbetten doğrulayamıyorum ve kesin randevu sözü veremem. Tarihlerinizi talebe ekleyelim; ekibimiz uygunluğu kontrol edip size bilgi versin.' },
  { pattern: /qr|karekod|barkod|kod.*(?:gel|ne zaman)/, answer: 'Randevu onaylandığında kişiye özel QR bilgisi paylaşılır. Randevudaki isim, tarih ve saati kontrol edin; girişte güncel resmî talimatları izleyin. Bu sohbet QR kodu üretmez.', link: { href:'/talep', label:'Talebimi takip et' } },
  { pattern: /kabr|kabir|mezar|ravza (?:nedir|nerede)|peygamber/, answer: 'Ravza-i Mutahhara, Mescid-i Nebevî’de Peygamber Efendimizin (s.a.v.) evi ile minberi arasındaki mübarek alandır. Ravza’da namaz için randevu süreci ile kabr-i şerife selam ziyareti güzergâhı farklıdır. Hangi ziyareti planladığınızı ekibimize belirtebilirsiniz.', link: { href:'/rehber', label:'Ziyaret rehberini oku' } },
  { pattern: /nusuk|resmi|randevu nasil|nasil (?:alin|calis)|nasil randevu|izin/, answer: 'Ravza randevusu için resmî kanal Nusuk’tur. Burada ziyaret talebinizi hazırlayıp ekibimize iletebilirsiniz. Talebin alınması, resmî iznin verildiği anlamına gelmez.', link: { href:'https://www.nusuk.sa/rawdah/', label:'Resmî Nusuk bilgisi' } },
  { pattern: /ayni saat|birlikte gir|neden ayri|neden.*sor|kadin.*saat|erkek.*saat/, answer: 'Kadın ve erkek ziyaretçilerin randevu saatleri ayrı değerlendirildiği için dağılımı soruyoruz. Aile veya grup olarak talep verebilirsiniz; aynı saatte giriş sözü veremeyiz.' },
  { pattern: /iptal|vazgec|iade/, answer: 'Mevcut talebinizi iptal etmek veya değiştirmek için talep kodunuzla ekibe ulaşın. Bu sohbet kayıtlı talebi iptal edemez. Geçerli koşulları hizmet koşulları sayfasından kontrol edebilirsiniz.', link: { href:'/sozlesme', label:'Hizmet koşulları' } },
  { pattern: /takip|talebim|TALEP-|talep-/, answer: 'Kayıtlı talebinizi talep kodu ve başvuruda kullandığınız telefonun son dört hanesiyle takip edebilirsiniz. Bu sohbette kayıt sorgulanmaz.', link: { href:'/talep', label:'Talep takibine git' } },
  { pattern: /temsilci|insan|yetkili|destek|telefon|whatsapp|iletisim|ara(?:yin|r mis)/, answer: 'Ekibimize ulaşmak için iletişim sayfasını kullanabilirsiniz. Ziyaret bilgilerinizi talep formuna aktarıp iletişim bilgilerinizi orada paylaşmanız da mümkün.', link: { href:'/iletisim', label:'İletişim kanalları' } },
  { pattern: /pasaport|belge|kimlik|bilgilerim|guvenli/, answer: 'İlk talepte kişi sayısı, tarihler ve iletişim bilgileri yeterli. Sohbete pasaport görseli, parola veya kart bilgisi yazmayın. Gerekli ziyaret belgeleri için güncel resmî talimatları esas alın.', link: { href:'/aydinlatma', label:'Bilgilerinizin kullanımı' } },
  { pattern: /engelli|tekerlekli|yasli|cocuk|bebek/, answer: 'Özel ihtiyacınızı talep formunun not alanına ekleyebilirsiniz. Yaş, erişilebilirlik ve giriş koşullarını güncel resmî uygulama üzerinden ekibimizle teyit edin; burada uygunluk sözü veremem.' },
  { pattern: /umre|ucak|otel|vize|hac paketi/, answer: 'Bu asistan Medine’deki Ravza ziyaret talebi için yardımcı olur. Uçuş, otel veya vize rezervasyonu yapmaz. Ravza ziyaretini kaç kişi için planlıyorsunuz?' },
];

export function respondToVisit(message: string, previous: VisitDetails, now = new Date()): ConversationReply {
  const raw = normalize(message.trim().slice(0, 1000));
  const normalized = numericWords(raw);
  let details = { ...previous };
  const reply = (text: string, link?: ConversationReply['link']): ConversationReply => ({ details, text, suggestions: visitSuggestions(details), ...(link ? { link } : {}) });
  if (/^(yeni bastan baslayalim|bastan|sifirla|yeniden basla|yeni talep)[.! ]*$/.test(raw)) {
    details = { ...emptyVisit };
    return reply(`Sohbetteki ziyaret bilgilerini temizledim. ${visitPrompt(details)}`);
  }
  if (/ozet/.test(raw)) return reply(`${visitSummary(details) || 'Henüz ziyaret bilgisi paylaşmadınız.'}\n\n${visitPrompt(details)}`);
  // Do not reinterpret phone numbers, dates, or ambiguous bare numbers as headcount.
  const known = knowledge.find(item => item.pattern.test(raw));
  const question = /\?|\b(?:kac|nasil|neden|mi|midir|olur mu|ne zaman)\b/.test(raw);
  let count = countBeforeOrAfter(normalized, 'kisi');
  if (/tek kisiyim|yalniz ben|sadece ben/.test(raw)) count = 1;
  if (/esim ve ben|esimle ikimiz/.test(raw)) count = 2;
  if (/^\d+$/.test(normalized) && visitStage(previous) === 'people') count = +normalized;
  let women = countBeforeOrAfter(normalized, 'kadin|bayan');
  let men = countBeforeOrAfter(normalized, 'erkek');
  if (question && count === null) { women = null; men = null; }
  if (count !== null && (!Number.isInteger(count) || count < 1 || count > 500)) return reply('Kişi sayısı 1 ile 500 arasında olmalı. Kaç ziyaretçi olacağını yeniden yazabilir misiniz?');
  if ((women !== null && women > 500) || (men !== null && men > 500)) return reply('Ziyaretçi sayısı 500’ü aşamaz. Kadın ve erkek sayılarını kontrol edebilir misiniz?');
  const acknowledgements: string[] = [];
  if (count !== null) {
    if (count !== details.personCount && details.femaleCount !== null && details.maleCount !== null && details.femaleCount + details.maleCount !== count) { details.femaleCount = null; details.maleCount = null; }
    details.personCount = count;
    acknowledgements.push(`Ziyaretçi sayısını ${count} kişi olarak aldım.`);
  }
  if (!question && /hepimiz|tamami|sadece|yalnizca|tek/.test(raw) && details.personCount && /kadin|erkeg|erkek/.test(raw)) {
    if (/kadin/.test(raw)) { women = details.personCount; men = 0; }
    else { men = details.personCount; women = 0; }
  }
  if (women !== null) details.femaleCount = women;
  if (men !== null) details.maleCount = men;
  if (!details.personCount && women !== null && men !== null && women + men > 0) details.personCount = women + men;
  if (details.personCount && details.femaleCount !== null && details.maleCount !== null && details.femaleCount + details.maleCount !== details.personCount) {
    return reply(`Toplam ${details.personCount} kişi belirtmiştiniz; dağılım ise ${details.femaleCount + details.maleCount} ediyor. Toplam kişi sayısını veya kadın ve erkek dağılımını düzeltebilir misiniz?`);
  }
  if (women !== null || men !== null) acknowledgements.push(`Dağılımı güncelledim: ${details.femaleCount === null ? 'kadın sayısı eksik' : `${details.femaleCount} kadın`}, ${details.maleCount === null ? 'erkek sayısı eksik' : `${details.maleCount} erkek`}.`);
  const dates = extractDates(raw, localToday(now));
  if (dates && !question) {
    const problem = validateVisitDates(dates.from, dates.to, localToday(now));
    if (problem) return reply(`${acknowledgements.join(' ')} ${problem}`.trim());
    details.dateFrom = dates.from; details.dateTo = dates.to;
    acknowledgements.push('Ziyaret tarihlerinizi ekledim.');
  }
  if (/esnek degil|kesin tarih/.test(raw)) details.flexible = false;
  else if (/esnek/.test(raw)) { details.flexible = true; acknowledgements.push('Belirttiğiniz tarih aralığında esnek olduğunuzu not ettim.'); }
  const time = raw.match(/\b(sabah|ogleden sonra|aksam|gece|saat fark etmez)\b/);
  if (time && !question) {
    details.timePreference = ({ sabah:'morning', 'ogleden sonra':'afternoon', aksam:'evening', gece:'night', 'saat fark etmez':'any' } as Record<string, TimePreference>)[time[1]];
    acknowledgements.push('Saat tercihinizi not ettim; bu henüz kesinleşmiş bir randevu değil.');
  }
  if (known) return reply(`${acknowledgements.join(' ')}${acknowledgements.length ? '\n\n' : ''}${known.answer}\n\n${visitPrompt(details)}`, known.link);
  if (acknowledgements.length) return reply(`${acknowledgements.join(' ')}\n\n${visitPrompt(details)}`);
  if (/tarih.*(?:bilmiyorum|belli degil|belirsiz)|henüz/.test(raw)) return reply('Sorun değil. Medine’de olacağınız tarih aralığı netleştiğinde devam edebilirsiniz. Tarih olmadan uygunluk değerlendirmesi yapılamaz; yaklaşık aralığınız varsa onu yazın.');
  if (/^(merhaba|selam|selamun aleykum|selamunaleykum|iyi gunler)[.! ]*$/.test(raw)) return reply(`Hoş geldiniz. Ravza ziyaretinizi birlikte planlayalım. ${visitPrompt(details)}`);
  if (/tesekkur|sag ol/.test(raw)) return reply(`Rica ederim. ${visitPrompt(details)}`);
  if (/^(tamam|evet|devam|olur)[.! ]*$/.test(raw)) return reply(visitPrompt(details));
  return reply(`Bu mesajdan kesin bir ziyaret bilgisi çıkaramadım. Ravza randevusu, QR, ücret ve talep takibi hakkında yardımcı olabilirim.\n\n${visitPrompt(details)}`);
}
