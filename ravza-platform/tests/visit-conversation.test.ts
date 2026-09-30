import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyVisit,
  respondToVisit,
  validateVisitDates,
  visitStage,
  visitProgress,
  visitMissingFields,
  localToday,
} from "../lib/visit-conversation.ts";

const now = new Date("2026-09-21T09:00:00Z");
const reply = (text: string, previous = { ...emptyVisit }) => respondToVisit(text, previous, now);

void test("tek mesajdaki kişi dağılımını ve tarihleri birlikte anlar", () => {
  const result = reply("5 kişiyiz, 2 kadın 3 erkek, 1-5 Ekim 2026");
  assert.equal(result.details.personCount, 5);
  assert.equal(result.details.femaleCount, 2);
  assert.equal(result.details.maleCount, 3);
  assert.equal(result.details.dateFrom, "2026-10-01");
  assert.equal(result.details.dateTo, "2026-10-05");
  assert.equal(visitStage(result.details), "ready");
  assert.match(result.text, /Talep gönderimi randevu onayı değildir/);
});
void test("araya giren ücret sorusunda bilgileri unutmaz", () => {
  const initial = reply("5 kişiyiz").details;
  const result = reply("Ücret nasıl belirleniyor?", initial);
  assert.deepEqual(result.details, initial);
  assert.match(result.text, /\$2\.50 USD/);
  assert.match(result.text, /5 kişilik grubunuz kadın mı, erkek mi, yoksa karışık mı/);
});
void test("selamlama, dağılım ve tarih konuşması sırayla ilerler", () => {
  let result = reply("Merhaba");
  assert.match(result.text, /Hoş geldiniz/);
  result = reply("beş kişiyiz", result.details);
  result = reply("iki kadın üç erkek", result.details);
  assert.equal(visitStage(result.details), "dates");
  result = reply("01.10.2026 - 05.10.2026", result.details);
  assert.equal(visitStage(result.details), "ready");
});
void test("kişi sayısı değişirse eski dağılımı yeniden sorar, tarihleri tutar", () => {
  const before = reply("5 kişiyiz, 2 kadın 3 erkek, 1-5 Ekim 2026").details;
  const result = reply("Aslında 6 kişiyiz", before);
  assert.equal(result.details.personCount, 6);
  assert.equal(result.details.femaleCount, null);
  assert.equal(result.details.maleCount, null);
  assert.equal(result.details.dateFrom, "2026-10-01");
  assert.equal(visitStage(result.details), "distribution");
});
void test("çelişen dağılımı sessizce kabul etmez", () => {
  const result = reply("2 kadın 4 erkek", reply("5 kişiyiz").details);
  assert.match(result.text, /dağılım ise 6 ediyor/);
  assert.equal(visitStage(result.details), "distribution");
});
void test("kişi sayısı olmayan kadın-erkek dağılımından toplamı hesaplar", () => {
  const result = reply("2 kadın 3 erkek");
  assert.equal(result.details.personCount, 5);
  assert.equal(visitStage(result.details), "dates");
});
void test("hepimiz kadınız ve hepimiz erkeğiz toplam kişiyi kullanır", () => {
  const previous = reply("3 kişiyiz").details;
  assert.equal(reply("Hepimiz kadınız", previous).details.femaleCount, 3);
  assert.equal(reply("Hepimiz erkeğiz", previous).details.maleCount, 3);
});
void test("eşim ve ben ifadesinden cinsiyet çıkarmaz", () => {
  const result = reply("eşim ve ben");
  assert.equal(result.details.personCount, 2);
  assert.equal(result.details.femaleCount, null);
  assert.equal(result.details.maleCount, null);
});
void test("500 üzeri ve sıfır kişi kabul edilmez", () => {
  for (const message of ["501 kişiyiz", "0 kişi", "-5 kişi", "2.5 kişi", "2,5 kişi"])
    assert.equal(reply(message).details.personCount, null);
});
void test("geçersiz dağılım ve toplam üst sınırı kabul edilmez", () => {
  for (const message of ["300 kadın 300 erkek", "2.5 kadın 3 erkek", "-2 kadın 3 erkek"])
    assert.deepEqual(reply(message).details, emptyVisit);
});
void test("tek ziyaretçinin kısa cinsiyet yanıtını anlar", () => {
  const person = reply("Tek kişiyim").details;
  assert.equal(reply("Erkeğim", person).details.maleCount, 1);
  assert.equal(reply("Kadınım", person).details.femaleCount, 1);
});
void test("geçmiş ve geçersiz tarih için doğru açıklama verir", () => {
  assert.match(reply("1-5 Eylül 2026").text, /geçmişte/);
  assert.match(reply("31 Şubat 2027").text, /Geçerli bir/);
  assert.equal(reply("31 Şubat 2027").details.dateFrom, "");
});
void test("ters ve çok uzun tarih aralığını reddeder", () => {
  assert.match(validateVisitDates("2026-10-05", "2026-10-01", "2026-09-21")!, /Bitiş tarihi/);
  assert.match(validateVisitDates("2026-10-01", "2027-01-01", "2026-09-21")!, /60 günlük/);
});
void test("yarın İstanbul tarihine göre hesaplanır", () => {
  assert.equal(reply("Yarın").details.dateFrom, "2026-09-22");
  assert.equal(localToday(new Date("2026-09-21T22:30:00Z")), "2026-09-22");
});
void test("iki farklı ayı içeren tarih aralığını anlar", () => {
  const result = reply("30 Eylül - 3 Ekim 2027");
  assert.equal(result.details.dateFrom, "2027-09-30");
  assert.equal(result.details.dateTo, "2027-10-03");
});
void test("tarih mesajındaki sayıyı kişi sayısı sanmaz", () => {
  const result = reply("1-5 Ekim 2026");
  assert.equal(result.details.personCount, null);
  assert.equal(result.details.dateFrom, "2026-10-01");
});
void test("soru içindeki tarih ziyaret tercihi olarak kaydedilmez", () => {
  assert.equal(reply("1 Ekim 2026 için kontenjan var mı?").details.dateFrom, "");
});
void test("bilinmeyen soruda açıkça sınırını belirtir ve bağlamı korur", () => {
  const previous = reply("5 kişiyiz").details;
  const result = reply("Yarın uçak saat kaçta kalkıyor?", previous);
  assert.deepEqual(result.details, previous);
  assert.match(result.text, /rezervasyonu yapmaz/);
});
void test("takip ve iptal isteğini yapılmış işlem gibi sunmaz", () => {
  assert.equal(reply("Talebimi takip et").link?.href, "/talep");
  assert.match(reply("Randevumu iptal et").text, /iptal edemez/);
});
void test("sıfırlama yalnız yerel sohbet bilgilerini temizler", () => {
  const result = reply("Yeni baştan başlayalım", reply("5 kişiyiz").details);
  assert.deepEqual(result.details, emptyVisit);
  assert.match(result.text, /Sohbetteki/);
});
void test("bilgi talepleri randevu onayı iddiasına dönüşmez", () => {
  assert.match(reply("Randevu garantili mi?").text, /kesin randevu sözü veremem/);
  assert.match(reply("Nusuk nedir?").text, /resmî kanal Nusuk/);
  assert.match(reply("QR kodu ne zaman gelir?").text, /sohbet QR kodu üretmez/);
  assert.match(reply("Boş yer var mı?").text, /boş randevu saatleri/);
});
void test("ziyaret hazırlığının ilerlemesini ve eksik alanlarını hesaplar", () => {
  assert.equal(visitProgress(emptyVisit), 0);
  assert.deepEqual(visitMissingFields(emptyVisit), ["personCount", "dates"]);
  const people = reply("5 kişiyiz").details;
  assert.equal(visitProgress(people), 33);
  assert.deepEqual(visitMissingFields(people), ["distribution", "dates"]);
  const ready = reply("1-5 Ekim 2026", reply("2 kadın 3 erkek", people).details).details;
  assert.equal(visitProgress(ready), 100);
  assert.deepEqual(visitMissingFields(ready), []);
});
void test("hesap, onay ve geçmiş işlem akışını açıklar", () => {
  assert.equal(reply("Hesap nasıl oluşturulur?").link?.href, "/register");
  assert.match(reply("Admin onaylayınca QR ne zaman görünür?").text, /QR bağlantıları talep sayfanızda/);
  assert.equal(reply("Eski işlemler nerede? ").link?.href, "/hesabim");
});
void test("asistanın yeteneklerini ve güvenli bilgi sınırını açıklar", () => {
  assert.match(reply("Sen neler yapabiliyorsun?").text, /Ravza ziyaret asistanıyım/);
  assert.equal(reply("Hangi bilgileri vermem gerekiyor?").link?.href, "/siparis");
  assert.match(reply("KVKK ve verilerim güvenli mi?").text, /pasaport görseli/);
});
void test("sık sorulan yeni niyetleri aynı cevaba düşürmeden yanıtlar", () => {
  assert.equal(reply("Süreç nasıl ilerliyor?").link?.href, "/rehber");
  assert.match(reply("Ravza nerede?").text, /Mescid-i Nebevî/);
  assert.match(reply("Nasılsın?").text, /Teşekkür ederim/);
  const first = reply("Bambaşka bir cümle").text;
  const second = reply("Bir başka cümle daha").text;
  assert.notEqual(first, second);
});
void test("kararsız ziyaretçiye doğal bir başlangıç yolu verir", () => {
  assert.match(reply("Kararsızım, bana yardımcı olur musun?").text, /birlikte ilerleyebiliriz/);
  assert.equal(reply("Ziyaret adabı ve ne giymeliyim?").link?.href, "/rehber");
});
void test("dağılım önce kadın / erkek / karışık diye sorulur", () => {
  const people = reply("5 kişiyiz");
  assert.match(people.text, /kadın mı, erkek mi, yoksa karışık mı/);
  assert.deepEqual(people.suggestions, ["Kadın", "Erkek", "Karışık", "Neden ayrı soruluyor?"]);
  const women = reply("Kadın", people.details);
  assert.equal(women.details.femaleCount, 5);
  assert.equal(women.details.maleCount, 0);
  assert.equal(visitStage(women.details), "dates");
  assert.equal(reply("Erkek", people.details).details.maleCount, 5);
});
void test("karışık seçilince sayılar istenir ve tek cinsiyet sayısı yeterlidir", () => {
  const people = reply("5 kişiyiz").details;
  const mixed = reply("Karışık", people);
  assert.match(mixed.text, /kaçı kadın, kaçı erkek/);
  assert.equal(visitStage(mixed.details), "distribution");
  assert.deepEqual(mixed.suggestions, ["1 kadın 4 erkek", "2 kadın 3 erkek", "3 kadın 2 erkek", "4 kadın 1 erkek"]);
  const partial = reply("2 kadın", mixed.details);
  assert.equal(partial.details.femaleCount, 2);
  assert.equal(partial.details.maleCount, 3);
  assert.equal(visitStage(partial.details), "dates");
});
void test("tek kişilik talepte karışık seçeneği sunulmaz", () => {
  const one = reply("Tek kişiyim");
  assert.match(one.text, /Kadın mısınız, erkek mi/);
  assert.deepEqual(one.suggestions, ["Kadın", "Erkek", "Neden ayrı soruluyor?"]);
  assert.equal(reply("Erkek", one.details).details.maleCount, 1);
});
void test("karışık grubu cümle içinde ve ekli hâlleriyle anlar, cinsiyet uydurmaz", () => {
  const five = { ...emptyVisit, personCount: 5 };
  for (const message of ["karışık", "Karışığız", "karışık bir grubuz", "hem kadın hem erkek var", "Karışık 5 kişiyiz"]) {
    const result = reply(message, message.includes("5 kişi") ? { ...emptyVisit } : five);
    assert.equal(result.details.personCount, 5, message);
    assert.equal(result.details.femaleCount, null, message);
    assert.equal(result.details.maleCount, null, message);
    assert.match(result.text, /kaçı kadın, kaçı erkek/, message);
  }
});
void test("tamamı kadın/erkek ve ekli sayı biçimlerini anlar", () => {
  const five = { ...emptyVisit, personCount: 5 };
  assert.deepEqual([reply("hepsi kadın", five).details.femaleCount, reply("hepsi kadın", five).details.maleCount], [5, 0]);
  assert.deepEqual([reply("sadece erkekler", five).details.femaleCount, reply("sadece erkekler", five).details.maleCount], [0, 5]);
  assert.equal(reply("erkeğiz", five).details.maleCount, 5);
  const split = reply("2'si kadın 3'ü erkek", five).details;
  assert.deepEqual([split.femaleCount, split.maleCount], [2, 3]);
});
void test("soru içindeki tarihi boş saat sorgusu için döndürür ama talebe yazmaz", () => {
  const result = reply("5 Ekim'de boş saat var mı?", { ...emptyVisit, personCount: 5 });
  assert.equal(result.details.dateFrom, "");
  assert.equal(result.mentionedDate?.from, "2026-10-05");
  assert.equal(result.intent, "knowledge");
});
void test("acente ve kontör sorularını acente paneline yönlendirir", () => {
  assert.equal(reply("Kontör nasıl alırım?").link?.href, "/acente/basvuru");
});
