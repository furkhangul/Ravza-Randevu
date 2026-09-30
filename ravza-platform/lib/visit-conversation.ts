import { isValidIsoDate } from "./date-validation.ts";
import type { TimePreference } from "./quote-request.ts";

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
  personCount: null,
  femaleCount: null,
  maleCount: null,
  dateFrom: "",
  dateTo: "",
  flexible: false,
  timePreference: "any",
};
export type VisitStage = "people" | "distribution" | "dates" | "ready";
export type VisitField = "personCount" | "distribution" | "dates";
/** Kural motorunun mesajı nasıl anladığı: sunucu buna göre yapay zekâya gerek olup olmadığına karar verir. */
export type ReplyIntent = "slots" | "knowledge" | "smalltalk" | "control" | "question" | "unknown";
export type ConversationReply = {
  details: VisitDetails;
  text: string;
  suggestions: string[];
  link?: { href: string; label: string };
  requestQuestion?: string;
  intent?: ReplyIntent;
  /** Mesajda geçen tarih (soru içinde olsa bile); boş saat sorgusu için kullanılır, talebe yazılmaz. */
  mentionedDate?: { from: string; to: string };
};

export function visitProgress(value: VisitDetails): number {
  switch (visitStage(value)) {
    case "people":
      return 0;
    case "distribution":
      return 33;
    case "dates":
      return 67;
    case "ready":
      return 100;
  }
}

export function visitMissingFields(value: VisitDetails): VisitField[] {
  const missing: VisitField[] = [];
  if (!value.personCount) missing.push("personCount");
  if (
    value.personCount &&
    (value.femaleCount === null ||
      value.maleCount === null ||
      value.femaleCount + value.maleCount !== value.personCount)
  )
    missing.push("distribution");
  if (!value.dateFrom || !value.dateTo) missing.push("dates");
  return missing;
}

export function visitStage(value: VisitDetails): VisitStage {
  if (!value.personCount) return "people";
  if (
    value.femaleCount === null ||
    value.maleCount === null ||
    value.femaleCount + value.maleCount !== value.personCount
  )
    return "distribution";
  if (!value.dateFrom || !value.dateTo) return "dates";
  return "ready";
}

export function visitPrompt(value: VisitDetails): string {
  switch (visitStage(value)) {
    case "people":
      return "Ravza ziyaretine kaç kişiyle gelmeyi düşünüyorsunuz?";
    case "distribution":
      // Önce grubun türü sorulur; "Karışık" denirse sayılar ayrıca istenir.
      return value.personCount === 1
        ? "Kadın mısınız, erkek mi? Ravza'da kadın ve erkek saatleri ayrıdır."
        : `${value.personCount} kişilik grubunuz kadın mı, erkek mi, yoksa karışık mı?`;
    case "dates":
      return "Harika, Medine’de hangi günler arasında olacaksınız? Mesela “1–5 Ekim 2026” yazabilirsiniz; tek gün de olur.";
    case "ready":
      return "Tamamdır, ziyaret bilgileriniz hazır. Şimdi talep formuna geçip kısa özeti kontrol edin; iletişim bilgilerinizi eklediğinizde başvuruyu gönderebilirsiniz. Talep gönderimi randevu onayı değildir, ekibimiz uygunluğu ayrıca değerlendirir.";
  }
}

/** Karışık grup için kısa dağılım seçenekleri (en fazla dört). */
export function mixedSplitSuggestions(personCount: number): string[] {
  if (personCount < 2) return [];
  const candidates =
    personCount <= 5
      ? Array.from({ length: personCount - 1 }, (_, index) => index + 1)
      : [1, Math.floor(personCount / 3), Math.ceil(personCount / 2), personCount - 1];
  return [...new Set(candidates)]
    .filter((women) => women >= 1 && women < personCount)
    .slice(0, 4)
    .map((women) => `${women} kadın ${personCount - women} erkek`);
}

export function visitSuggestions(value: VisitDetails, options: { mixed?: boolean } = {}): string[] {
  if (visitStage(value) === "distribution" && value.personCount) {
    if (value.personCount === 1) return ["Kadın", "Erkek", "Neden ayrı soruluyor?"];
    if (options.mixed) return mixedSplitSuggestions(value.personCount);
    return ["Kadın", "Erkek", "Karışık", "Neden ayrı soruluyor?"];
  }
  switch (visitStage(value)) {
    case "people":
      return ["Tek kişiyim", "Aile olarak geleceğiz", "Kafile / acente", "Randevu nasıl alınır?"];
    case "distribution":
      return ["2 kadın 3 erkek", "Hepimiz kadınız", "Hepimiz erkeğiz", "Neden ayrı soruluyor?"];
    case "dates":
      return ["Yarın", "1–5 Ekim 2026", "Tarihleri henüz bilmiyorum", "Randevu garantili mi?"];
    case "ready":
      return ["Bilgilerimi özetle", "Onaylanınca ne olur?", "QR kodu ne zaman gelir?", "Yeni baştan başlayalım"];
  }
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-");
}
function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function localToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-${parts.find((p) => p.type === "day")!.value}`;
}
export function validateVisitDates(from: string, to: string, today = localToday()): string | null {
  if (!isValidIsoDate(from) || !isValidIsoDate(to))
    return "Geçerli bir başlangıç ve bitiş tarihi yazın.";
  if (from < today)
    return "Bu tarih geçmişte kalıyor. Medine’de bulunacağınız güncel tarihleri yazabilir misiniz?";
  if (to < from)
    return "Bitiş tarihi başlangıçtan önce olamaz. Tarih aralığını yeniden yazabilir misiniz?";
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 60)
    return "En fazla 60 günlük bir ziyaret aralığı belirtebilirsiniz. Aralığı daraltabilir misiniz?";
  return null;
}

const monthNames = [
  "ocak",
  "subat",
  "mart",
  "nisan",
  "mayis",
  "haziran",
  "temmuz",
  "agustos",
  "eylul",
  "ekim",
  "kasim",
  "aralik",
];
function extractDates(message: string, today: string): { from: string; to: string } | null {
  const explicit = [
    ...message.matchAll(
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g,
    ),
  ].map((m) => (m[1] ? iso(+m[1], +m[2], +m[3]) : iso(+m[6], +m[5], +m[4])));
  if (explicit.length) return { from: explicit[0], to: explicit[1] ?? explicit[0] };
  const named = new RegExp(
    `\\b(\\d{1,2})(?:\\s*(?:-|ile)\\s*(\\d{1,2}))?\\s+(${monthNames.join("|")})(?:\\s+(20\\d{2}))?`,
    "g",
  );
  const matches = [...message.matchAll(named)];
  if (matches.length) {
    // A trailing year applies to both dates (e.g. 30 Eylül - 3 Ekim 2027).
    const year = +(matches.find((m) => m[4])?.[4] ?? today.slice(0, 4));
    const first = matches[0];
    const last = matches[matches.length - 1];
    return {
      from: iso(+(first[4] ?? year), monthNames.indexOf(first[3]) + 1, +first[1]),
      to: iso(+(last[4] ?? year), monthNames.indexOf(last[3]) + 1, +(last[2] ?? last[1])),
    };
  }
  if (/\b(yarin|bugun)\b/.test(message)) {
    const date = new Date(`${today}T12:00:00Z`);
    if (/\byarin\b/.test(message)) date.setUTCDate(date.getUTCDate() + 1);
    const value = date.toISOString().slice(0, 10);
    return { from: value, to: value };
  }
  return null;
}
const numberWords: Record<string, number> = {
  sifir: 0,
  bir: 1,
  iki: 2,
  uc: 3,
  dort: 4,
  bes: 5,
  alti: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yirmi: 20,
  otuz: 30,
  kirk: 40,
  elli: 50,
};
function numericWords(value: string) {
  return value.replace(
    /\b(on|yirmi|otuz|kirk|elli)(?:\s+(bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz))?\b|\b(sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz)\b/g,
    (_, tens, unit, single) =>
      String(single ? numberWords[single] : numberWords[tens] + (numberWords[unit] ?? 0)),
  );
}
function countBeforeOrAfter(message: string, noun: string): number | null {
  const match =
    message.match(new RegExp(`(?<![\\d.])([+-]?\\d+(?:[.,]\\d+)?)\\s*(?:tane\\s+)?(?:${noun})`)) ??
    message.match(new RegExp(`(?:${noun})\\s*:?\\s*([+-]?\\d+(?:[.,]\\d+)?)\\b`));
  return match ? Number(match[1].replace(",", ".")) : null;
}
export function visitSummary(details: VisitDetails) {
  const parts: string[] = [];
  if (details.personCount) parts.push(`${details.personCount} kişi`);
  if (details.femaleCount !== null) parts.push(`${details.femaleCount} kadın`);
  if (details.maleCount !== null) parts.push(`${details.maleCount} erkek`);
  if (details.dateFrom) {
    const format = (d: string) =>
      new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${d}T12:00:00Z`));
    parts.push(
      details.dateFrom === details.dateTo
        ? format(details.dateFrom)
        : `${format(details.dateFrom)} – ${format(details.dateTo)}`,
    );
  }
  if (details.flexible) parts.push("Belirtilen aralıkta esnek");
  return parts.join(" · ");
}

const knowledge: Array<{ pattern: RegExp; answer: string; link?: ConversationReply["link"] }> = [
  {
    pattern: /hesap|kayit ol|kayit|giris yap|sifre|oturum/,
    answer:
      "Hesap açmak isteğe bağlıdır; talep ve takip için gerekmez. Hesap açarsanız profilinizi kaydeder ve başvurularınızı tek yerden izlersiniz. E-posta ve parola ile kayıt olabilirsiniz. Parolanızı buraya yazmayın.",
    link: { href: "/register", label: "Hesap oluştur" },
  },
  {
    pattern: /onaylaninca|onay.*sonra|kabul edilince|admin|ekip.*onay|talep.*onay/,
    answer:
      "Talebiniz bize ulaştıktan sonra ekibimiz tarihleri, kişi dağılımını ve boş yerleri kontrol eder, fiyatı sizinle netleştirir. Onayınızdan sonra randevu alınır ve QR bağlantıları talep sayfanızda görünür; QR kodu randevu saatinden yaklaşık 2 saat önce bağlantıda hazır olur. Talep göndermek tek başına randevunun kesinleştiği anlamına gelmez.",
    link: { href: "/talep", label: "Talebimi takip et" },
  },
  {
    pattern: /eski islem|gecmis|arsiv|ziyaret.*gec|sonra.*ne olur/,
    answer:
      "Ziyaret gününüz geçtikten bir gün sonra kayıt otomatik olarak “Eski işlemler” bölümüne taşınır. Özet ve işlem durumu orada kalır; QR kartı da artık aktif işlemler arasında görünmez.",
    link: { href: "/hesabim", label: "Eski işlemleri gör" },
  },
  {
    pattern: /acente (?:paneli|girisi|hesabi|basvuru)|kontor|toplu (?:randevu|alim)|sirket(?:im)? (?:olarak|icin)/,
    answer:
      "Acente ve şirketler için ayrı bir panel var: Giriş yap → Acente / Şirket sekmesinden başvuru yaparsınız. Onaylanınca toplu kontör alır (1 kontör = 1 kişilik randevu), boş saatlerden randevunuzu kendiniz oluşturur ve QR bağlantılarını yolcularınıza iletirsiniz. Fiyat ve ödeme ekibimizle netleşir.",
    link: { href: "/acente/basvuru", label: "Acente başvurusu" },
  },
  {
    pattern: /bireysel|tek kisi|aile|kafile|acente|grup/,
    answer:
      "Tek başınıza, ailenizle, kafileyle ya da acente olarak başvurabilirsiniz. Önce toplam kişi sayısını yazın, sonra grubun kadın, erkek ya da karışık olduğunu seçin; grubun tamamını tek talepte ekleyebilirsiniz.",
    link: { href: "/siparis", label: "Talep formuna geç" },
  },
  {
    pattern: /hangi bilgi|ne gerekli|form.*doldur|bilgi.*vermem|neleri.*yaz/,
    answer:
      "Başlamak için toplam kişi sayısı, kadın–erkek dağılımı, Medine’de olacağınız tarih aralığı ve size ulaşabileceğimiz bir iletişim bilgisi yeterli. Pasaport, kart bilgisi veya parolanızı sohbete göndermeyin.",
    link: { href: "/siparis", label: "Talep formunu aç" },
  },
  {
    pattern: /degistir|guncelle|tarih.*degist|duzelt|yanlis yaz/,
    answer:
      "Henüz gönderilmemiş bilgileri bu sohbet içinde düzeltebilirsiniz. Gönderilmiş talebin tarihini veya kişi listesini değiştirmek için talep kodunuzla ekibimize ulaşın; mevcut kaydı burada kendim değiştiremiyorum.",
    link: { href: "/iletisim", label: "Ekiple iletişime geç" },
  },
  {
    pattern: /kvkk|gizlilik|veri|sakla|guvenlik|guvenli/,
    answer:
      "Bilgileriniz yalnızca ziyaret talebini değerlendirmek, sizinle iletişim kurmak ve hesabınızdaki işlemleri göstermek için kullanılır. Sohbete pasaport görseli, kart bilgisi veya parola yazmayın; ayrıntılar için aydınlatma metnini inceleyin.",
    link: { href: "/aydinlatma", label: "Aydınlatma metni" },
  },
  {
    pattern: /sen kimsin|neler yap|ne yapabil|canli.*bot|yapay zeka|asistan/,
    answer:
      "Ben Ravza ziyaret asistanıyım. Bu konuşmada verdiğiniz kişi, tarih ve saat tercihlerini hatırlayıp talep özetine dönüştürür; QR ve onay sürecini açıklar, sık sorulan soruları yanıtlar ve sizi forma yönlendiririm. Dış sistemlerde randevu açamam, ödeme alamam veya onay uyduramam.",
    link: { href: "/rehber", label: "Ravza rehberini incele" },
  },
  {
    pattern: /surec|asamalar|adim adim|nasil iler|ne olacak|sonra ne/,
    answer:
      "Süreç üç adımda ilerler: ziyaret bilgilerinizi birlikte netleştiririz, talep formunu iletişim bilgilerinizle gönderirsiniz, ekibimiz uygunluğu ve fiyatı sizinle netleştirir. Onaydan sonra QR bağlantılarınız talep sayfanızda görünür.",
    link: { href: "/rehber", label: "Süreci adım adım gör" },
  },
  {
    pattern: /(?:ravza|mescid).*nerede|nerede.*(?:ravza|mescid)|konum|hangi.*mescid/,
    answer:
      "Ravza-i Mutahhara, Medine’de Mescid-i Nebevî’nin içinde, Peygamber Efendimizin (s.a.v.) hücre-i saadeti ile minberi arasındaki mübarek bölgedir. Giriş ve saat bilgileri resmî uygulamadaki güncel kurallara göre belirlenir.",
    link: { href: "/rehber", label: "Ziyaret rehberini aç" },
  },
  {
    pattern: /nasilsin|naber|iyi misin|durumun ne/,
    answer:
      "Teşekkür ederim, hazırım. Kişi sayınızı, kadın–erkek dağılımınızı ve Medine tarihlerinizi yazarsanız ziyaret talebinizi birlikte hazırlayabiliriz.",
  },
  {
    pattern: /yardim|yardimci ol|baslayalim|nereden basla|kararsiz|emin degil/,
    answer:
      "Elbette, birlikte ilerleyebiliriz. Önce kaç kişi olduğunuzu yazın; sonra kadın–erkek dağılımını ve Medine’de bulunacağınız tarihleri soracağım. İsterseniz hazır seçeneklerden birine de dokunabilirsiniz.",
  },
  {
    pattern: /ziyaret adabi|ne giym|dua|hazirlik|yanima ne/,
    answer:
      "Ziyaret öncesi rehberimizde kıyafet, giriş, dua ve ziyaret günü hazırlıklarıyla ilgili temel bilgileri bulabilirsiniz. Resmî giriş kuralları değişebileceği için seyahatten önce güncel Nusuk ve Mescid-i Nebevî duyurularını da kontrol edin.",
    link: { href: "/rehber", label: "Hazırlık rehberini aç" },
  },
  {
    pattern: /fiyat|ucret|odeme|kac (?:tl|lira|dolar)|ne kadar|pahali/,
    answer:
      "Açılışa özel başlangıç fiyatı kişi başı $2.50 USD. Sitenin üstündeki para birimi seçiciyle yaklaşık TL veya SAR karşılığını görebilirsiniz; güncel tutarı kur ve talep kapsamına göre ekibimiz teyit eder. Site üzerinden ödeme alınmaz.",
    link: { href: "/iletisim", label: "Ücret bilgisi için ekibe yazın" },
  },
  {
    pattern: /garanti|kesin/,
    answer:
      "Burada kesin randevu sözü veremem. Talebiniz ekibimize ulaşır; uygunluk resmî sistemde kontrol edilir ve randevu yalnızca onaylandığında kesinleşir. Onay size ayrıca bildirilir.",
  },
  {
    pattern: /musait|uygunluk|kontenjan|yer var|bos yer|bos saat/,
    answer:
      "Kadın ve erkek saatleri ayrı listelenir. Kişi sayısını ve kadın–erkek dağılımını yazdığınızda sohbetin altında boş randevu saatleri açılır; gün seçip grubunuza uygun saati işaretleyebilirsiniz. Görünen boş yer anlıktır ve değişebilir; kesin randevu onayı ayrıca bildirilir.",
  },
  {
    pattern: /qr|karekod|barkod|kod.*(?:gel|ne zaman)/,
    answer:
      "Randevu alındığında QR bağlantılarınız talep sayfanızda görünür; kadın ve erkek grupları için ayrı bağlantı olur. QR kodu randevu saatinden yaklaşık 2 saat önce bağlantıda hazır olur, girişte görevliye okutursunuz. Bu sohbet QR kodu üretmez.",
    link: { href: "/talep", label: "Talebimi takip et" },
  },
  {
    pattern: /kabr|kabir|mezar|ravza (?:nedir|nerede)|peygamber/,
    answer:
      "Ravza-i Mutahhara, Mescid-i Nebevî’de Peygamber Efendimizin (s.a.v.) evi ile minberi arasındaki mübarek alandır. Ravza’da namaz için randevu süreci ile kabr-i şerife selam ziyareti güzergâhı farklıdır. Hangi ziyareti planladığınızı ekibimize belirtebilirsiniz.",
    link: { href: "/rehber", label: "Ziyaret rehberini oku" },
  },
  {
    pattern: /nusuk|resmi|randevu nasil|nasil (?:alin|calis)|nasil randevu|izin/,
    answer:
      "Ravza randevusu için resmî kanal Nusuk’tur. Burada ziyaret talebinizi hazırlayıp ekibimize iletebilirsiniz. Talebin alınması, resmî iznin verildiği anlamına gelmez.",
    link: { href: "https://www.nusuk.sa/rawdah/", label: "Resmî Nusuk bilgisi" },
  },
  {
    pattern: /ayni saat|birlikte gir|neden ayri|neden.*sor|kadin.*saat|erkek.*saat/,
    answer:
      "Kadın ve erkek ziyaretçilerin randevu saatleri ayrı değerlendirildiği için dağılımı soruyoruz. Aile veya grup olarak talep verebilirsiniz; aynı saatte giriş sözü veremeyiz.",
  },
  {
    pattern: /iptal|vazgec|iade/,
    answer:
      "Mevcut talebinizi iptal etmek veya değiştirmek için talep kodunuzla ekibe ulaşın. Bu sohbet kayıtlı talebi iptal edemez. Geçerli koşulları hizmet koşulları sayfasından kontrol edebilirsiniz.",
    link: { href: "/sozlesme", label: "Hizmet koşulları" },
  },
  {
    pattern: /takip|talebim|TALEP-|talep-/,
    answer:
      "Kayıtlı talebinizi talep kodu ve başvuruda kullandığınız telefonun son dört hanesiyle takip edebilirsiniz. Bu sohbette kayıt sorgulanmaz.",
    link: { href: "/talep", label: "Talep takibine git" },
  },
  {
    pattern: /temsilci|insan|yetkili|destek|telefon|whatsapp|iletisim|ara(?:yin|r mis)/,
    answer:
      "Ekibimize ulaşmak için iletişim sayfasını kullanabilirsiniz. Ziyaret bilgilerinizi talep formuna aktarıp iletişim bilgilerinizi orada paylaşmanız da mümkün.",
    link: { href: "/iletisim", label: "İletişim kanalları" },
  },
  {
    pattern: /pasaport|belge|kimlik|bilgilerim|guvenli/,
    answer:
      "İlk talepte kişi sayısı, tarihler ve iletişim bilgileri yeterli. Sohbete pasaport görseli, parola veya kart bilgisi yazmayın. Gerekli ziyaret belgeleri için güncel resmî talimatları esas alın.",
    link: { href: "/aydinlatma", label: "Bilgilerinizin kullanımı" },
  },
  {
    pattern: /engelli|tekerlekli|yasli|cocuk|bebek/,
    answer:
      "Özel ihtiyacınızı talep formunun not alanına ekleyebilirsiniz. Yaş, erişilebilirlik ve giriş koşullarını güncel resmî uygulama üzerinden ekibimizle teyit edin; burada uygunluk sözü veremem.",
  },
  {
    pattern: /umre|ihram|tavaf|sa.?y|umrah/,
    answer:
      "Umrenin temel akışı ihram, tavaf, sa’y ve saçın kısaltılması ya da tıraş edilmesidir. Mikat, niyet ve uygulama ayrıntıları için yetkili dinî rehberliği ve güncel resmî yönlendirmeleri izleyin.",
    link: { href: "/rehber", label: "Umre ve ziyaret rehberi" },
  },
  {
    pattern: /mekke|medine|kuba|uhud|kibleteyn|ziyaret edilecek yer|places to visit/,
    answer:
      "Mekke’de Mescid-i Haram; Medine’de Mescid-i Nebevî, Kuba Mescidi, Uhud ve Kıbleteyn öne çıkan ziyaret yerleridir. Ziyaret programı ve erişim koşulları değişebileceğinden güncel yerel duyuruları kontrol edin.",
    link: { href: "/rehber#ziyaret-yerleri", label: "Ziyaret yerlerini incele" },
  },
  {
    pattern: /ucak|otel|vize|hac paketi/,
    answer:
      "Bu asistan uçuş, otel veya vize rezervasyonu yapmaz; ancak umre hazırlığı ve Ravza ziyareti hakkında bilgi verebilir. Genel bilgiler için rehberimizi inceleyebilirsiniz.",
    link: { href: "/rehber", label: "Umre ve ziyaret rehberi" },
  },
];

function clarificationText(raw: string, details: VisitDetails, isQuestion: boolean): string {
  const variants = [
    "Mesajınızı aldım; yanlış yönlendirmemek için ziyaret planınızdan ilerleyelim.",
    "Bunu Ravza talebine bağlayabilmem için bir bilgiyi netleştirelim.",
    isQuestion
      ? "Bu soruyu bu bilgilerle kesinleştiremiyorum; size doğru yönü göstereyim."
      : "Bu ifadeyi tam eşleştiremedim, ancak ziyaretinizi birlikte hazırlayabiliriz.",
    "Bu konuda en doğru bilgiyi verebilmem için önce ziyaret ayrıntınızı tamamlayalım.",
    "Mesajınızı not ettim. Şimdi ziyaret talebinin eksik adımını birlikte tamamlayalım.",
  ];
  const seed = Array.from(raw).reduce(
    (sum, character, index) => sum + character.charCodeAt(0) * (index + 1),
    0,
  );
  return `${variants[seed % variants.length]}\n\n${visitPrompt(details)}`;
}

export function respondToVisit(
  message: string,
  previous: VisitDetails,
  now = new Date(),
): ConversationReply {
  const raw = normalize(message.trim().slice(0, 1000)).replace(/(\d+)['’]?(?:s?[iu]|y?[ie])\b/g, "$1");
  const normalized = numericWords(raw);
  let details = { ...previous };
  const reply = (text: string, link?: ConversationReply["link"], requestQuestion?: string): ConversationReply => ({
    details,
    text,
    suggestions: visitSuggestions(details),
    ...(link ? { link } : {}),
    ...(requestQuestion ? { requestQuestion } : {}),
  });
  if (/^(yeni bastan baslayalim|bastan|sifirla|yeniden basla|yeni talep)[.! ]*$/.test(raw)) {
    details = { ...emptyVisit };
    return { ...reply(`Sohbetteki ziyaret bilgilerini temizledim. ${visitPrompt(details)}`), intent: "control" };
  }
  if (/ozet/.test(raw))
    return { ...reply(
      `${visitSummary(details) || "Henüz ziyaret bilgisi paylaşmadınız."}\n\n${visitPrompt(details)}`,
    ), intent: "control" };
  // Do not reinterpret phone numbers, dates, or ambiguous bare numbers as headcount.
  const known = knowledge.find((item) => item.pattern.test(raw));
  const question = /\?|\b(?:kac|nasil|neden|mi|midir|olur mu|ne zaman|hangi|var mi)\b/.test(raw);
  let count = countBeforeOrAfter(normalized, "kisi");
  if (/tek kisiyim|yalniz ben|sadece ben/.test(raw)) count = 1;
  if (/esim ve ben|esimle ikimiz/.test(raw)) count = 2;
  if (/^\d+$/.test(normalized) && visitStage(previous) === "people") count = +normalized;
  let women = countBeforeOrAfter(normalized, "kadin|bayan");
  let men = countBeforeOrAfter(normalized, "erkek");
  if (question && count === null) {
    women = null;
    men = null;
  }
  if (count !== null && (!Number.isInteger(count) || count < 1 || count > 500))
    return reply(
      "Kişi sayısı 1 ile 500 arasında olmalı. Kaç ziyaretçi olacağını yeniden yazabilir misiniz?",
    );
  if (
    [women, men].some(
      (value) => value !== null && (!Number.isInteger(value) || value < 0 || value > 500),
    ) ||
    (women !== null && men !== null && women + men > 500)
  )
    return reply(
      "Kadın ve erkek sayıları 0 veya pozitif tam sayı olmalı; toplam 500’ü aşmamalı. Sayıları kontrol edebilir misiniz?",
    );
  const acknowledgements: string[] = [];
  if (count !== null) {
    if (
      count !== details.personCount &&
      details.femaleCount !== null &&
      details.maleCount !== null &&
      details.femaleCount + details.maleCount !== count
    ) {
      details.femaleCount = null;
      details.maleCount = null;
    }
    details.personCount = count;
    acknowledgements.push(`Ziyaretçi sayısını ${count} kişi olarak aldım.`);
  }
  if (
    !question &&
    /hepimiz|tamami|sadece|yalnizca|tek/.test(raw) &&
    details.personCount &&
    /kadin|erkeg|erkek/.test(raw)
  ) {
    if (/kadin/.test(raw)) {
      women = details.personCount;
      men = 0;
    } else {
      men = details.personCount;
      women = 0;
    }
  }
  if (!question && details.personCount === 1) {
    if (/^(ben )?kadinim[.! ]*$/.test(raw)) {
      women = 1;
      men = 0;
    }
    if (/^(ben )?erkegim[.! ]*$/.test(raw)) {
      men = 1;
      women = 0;
    }
  }
  // Cümle içinde grup türü: "karışığız", "karışık bir grubuz", "hepsi kadın", "sadece erkekler".
  const mixedIntent = /\bkaris(?:ik|ig)\w*|\bkarma\b|hem kadin(?:lar)? hem erkek|kadinli erkekli|kadin(?:lar)? ve erkek(?:ler)?/.test(raw);
  const onlyWomen = /\b(?:hepsi|hepimiz|tamami|tamamimiz|sadece|yalnizca|yalniz)\b.*\b(?:kadin|bayan|hanim)|\b(?:kadin|bayan)(?:iz|lariz|lar grubu)\b/.test(raw);
  const onlyMen = /\b(?:hepsi|hepimiz|tamami|tamamimiz|sadece|yalnizca|yalniz)\b.*\berke[kg]|\berke(?:giz|kleriz)\b/.test(raw);
  if (!question && details.personCount && women === null && men === null && !(onlyWomen && onlyMen)) {
    if (mixedIntent && !onlyWomen && !onlyMen) {
      if (details.personCount === 1)
        return { ...reply("Tek kişilik talepte kadın ya da erkek olarak belirtmeniz gerekiyor. Kadın mısınız, erkek mi?"), intent: "slots" };
      const n = details.personCount;
      return {
        ...reply(
          `${acknowledgements.length ? acknowledgements.join(" ") + " " : ""}Karışık grup olduğunu not ettim. ${n} kişinin kaçı kadın, kaçı erkek? Örneğin “${Math.ceil(n / 2)} kadın ${Math.floor(n / 2)} erkek” yazabilir ya da aşağıdan seçebilirsiniz.`,
        ),
        suggestions: mixedSplitSuggestions(n),
        intent: "slots",
      };
    }
    if (onlyWomen) {
      women = details.personCount;
      men = 0;
    } else if (onlyMen) {
      men = details.personCount;
      women = 0;
    }
  }
  // Dağılım aşamasında kısa yanıtlar: "Kadın", "Erkek", "Karışık".
  if (
    !question &&
    visitStage(previous) === "distribution" &&
    details.personCount &&
    women === null &&
    men === null &&
    count === null
  ) {
    if (/^(hepimiz |sadece |tamami |ben )?(kadin|kadinlar|kadiniz|bayan|bayanlar)[.! ]*$/.test(raw)) {
      women = details.personCount;
      men = 0;
    } else if (/^(hepimiz |sadece |tamami |ben )?(erkek|erkekler|erkegiz)[.! ]*$/.test(raw)) {
      men = details.personCount;
      women = 0;
    } else if (/^(karisik|karma|karisik grup(uz)?|kadin(lar)? ve erkek(ler)?)[.! ]*$/.test(raw)) {
      if (details.personCount === 1)
        return reply("Tek kişilik talepte kadın ya da erkek olarak belirtmeniz gerekiyor. Kadın mısınız, erkek mi?");
      const n = details.personCount;
      return {
        ...reply(
          `Karışık grubunuzda kaç kadın, kaç erkek var? Örneğin “${Math.ceil(n / 2)} kadın ${Math.floor(n / 2)} erkek” yazabilir ya da aşağıdan seçebilirsiniz.`,
        ),
        suggestions: mixedSplitSuggestions(n),
      };
    }
  }
  // Yalnız bir cinsiyet sayısı verildiyse geri kalanı toplamdan tamamlanır ("5 kişiyiz" + "2 kadın").
  if (!question && details.personCount) {
    if (women !== null && men === null && details.maleCount === null && women <= details.personCount)
      men = details.personCount - women;
    else if (men !== null && women === null && details.femaleCount === null && men <= details.personCount)
      women = details.personCount - men;
  }
  if (women !== null) details.femaleCount = women;
  if (men !== null) details.maleCount = men;
  if (!details.personCount && women !== null && men !== null && women + men > 0)
    details.personCount = women + men;
  if (
    details.personCount &&
    details.femaleCount !== null &&
    details.maleCount !== null &&
    details.femaleCount + details.maleCount !== details.personCount
  ) {
    return reply(
      `Toplam ${details.personCount} kişi belirtmiştiniz; dağılım ise ${details.femaleCount + details.maleCount} ediyor. Toplam kişi sayısını veya kadın ve erkek dağılımını düzeltebilir misiniz?`,
    );
  }
  if (women !== null || men !== null)
    acknowledgements.push(
      `Dağılımı güncelledim: ${details.femaleCount === null ? "kadın sayısı eksik" : `${details.femaleCount} kadın`}, ${details.maleCount === null ? "erkek sayısı eksik" : `${details.maleCount} erkek`}.`,
    );
  const dates = extractDates(raw, localToday(now));
  const mentionedDate =
    dates && !validateVisitDates(dates.from, dates.to, localToday(now)) ? dates : undefined;
  if (dates && !question) {
    const problem = validateVisitDates(dates.from, dates.to, localToday(now));
    if (problem) return reply(`${acknowledgements.join(" ")} ${problem}`.trim());
    details.dateFrom = dates.from;
    details.dateTo = dates.to;
    acknowledgements.push("Ziyaret tarihlerinizi ekledim.");
  }
  if (/esnek degil|kesin tarih/.test(raw)) details.flexible = false;
  else if (/esnek/.test(raw)) {
    details.flexible = true;
    acknowledgements.push("Belirttiğiniz tarih aralığında esnek olduğunuzu not ettim.");
  }
  const time = raw.match(/\b(sabah|ogleden sonra|aksam|gece|saat fark etmez)\b/);
  if (time && !question) {
    details.timePreference = (
      {
        sabah: "morning",
        "ogleden sonra": "afternoon",
        aksam: "evening",
        gece: "night",
        "saat fark etmez": "any",
      } as Record<string, TimePreference>
    )[time[1]];
    acknowledgements.push("Saat tercihinizi not ettim; bu henüz kesinleşmiş bir randevu değil.");
  }
  const tag = (result: ConversationReply, intent: ReplyIntent): ConversationReply => ({
    ...result,
    intent,
    ...(mentionedDate ? { mentionedDate } : {}),
  });
  // Bilgi veren cümlede ("Ailemle 5 kişiyiz", "Medine'deyiz") hazır bilgi yanıtı yerine talep adımı ilerler.
  if (known && !(acknowledgements.length && !question))
    return tag(
      reply(
        `${acknowledgements.join(" ")}${acknowledgements.length ? "\n\n" : ""}${known.answer}\n\n${visitPrompt(details)}`,
        known.link,
      ),
      "knowledge",
    );
  if (acknowledgements.length)
    return tag(reply(`${acknowledgements.join(" ")}\n\n${visitPrompt(details)}`), "slots");
  if (/tarih.*(?:bilmiyorum|belli degil|belirsiz)|henuz/.test(raw))
    return tag(reply(
      "Sorun değil. Medine’de olacağınız tarih aralığı netleştiğinde devam edebilirsiniz. Tarih olmadan uygunluk değerlendirmesi yapılamaz; yaklaşık aralığınız varsa onu yazın.",
    ), "smalltalk");
  if (/^(merhaba|selam|selamun aleykum|selamunaleykum|iyi gunler)[.! ]*$/.test(raw))
    return tag(reply(`Hoş geldiniz. Ravza ziyaretinizi birlikte planlayalım. ${visitPrompt(details)}`), "smalltalk");
  if (/tesekkur|sag ol/.test(raw)) return tag(reply(`Rica ederim. ${visitPrompt(details)}`), "smalltalk");
  if (/^(tamam|evet|devam|olur)[.! ]*$/.test(raw)) return tag(reply(visitPrompt(details)), "smalltalk");
  if (question)
    return tag(
      reply(
        "Bu soruya hazır yanıtım yok. Sorunuzu ekibe takip kodlu talep olarak iletebilirsiniz; iletişim bilgilerinizi ekleyip formu gönderdiğinizde size TALEP kodu verilir.",
        { href: "/siparis", label: "Sorunuzu ekleyip talep oluştur" },
        message.trim().slice(0, 1000),
      ),
      "question",
    );
  return tag(reply(clarificationText(raw, details, question)), "unknown");
}

