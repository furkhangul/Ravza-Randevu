import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyVisit, respondToVisit, validateVisitDates, visitStage, localToday } from '../lib/visit-conversation.ts';

const now = new Date('2026-09-21T09:00:00Z');
const reply = (text: string, previous = { ...emptyVisit }) => respondToVisit(text, previous, now);

test('tek mesajdaki kişi dağılımını ve tarihleri birlikte anlar', () => {
  const result=reply('5 kişiyiz, 2 kadın 3 erkek, 1-5 Ekim 2026');
  assert.equal(result.details.personCount,5);
  assert.equal(result.details.femaleCount,2);
  assert.equal(result.details.maleCount,3);
  assert.equal(result.details.dateFrom,'2026-10-01');
  assert.equal(result.details.dateTo,'2026-10-05');
  assert.equal(visitStage(result.details),'ready');
  assert.match(result.text,/ancak formu onaylayıp gönderdiğinizde/);
});
test('araya giren ücret sorusunda bilgileri unutmaz', () => {
  const initial=reply('5 kişiyiz').details;
  const result=reply('Ücret nasıl belirleniyor?',initial);
  assert.deepEqual(result.details,initial);
  assert.match(result.text,/Hizmet bedeli/);
  assert.match(result.text,/5 kişi için/);
});
test('selamlama, dağılım ve tarih konuşması sırayla ilerler', () => {
  let result=reply('Merhaba');
  assert.match(result.text,/Hoş geldiniz/);
  result=reply('beş kişiyiz',result.details);
  result=reply('iki kadın üç erkek',result.details);
  assert.equal(visitStage(result.details),'dates');
  result=reply('01.10.2026 - 05.10.2026',result.details);
  assert.equal(visitStage(result.details),'ready');
});
test('kişi sayısı değişirse eski dağılımı yeniden sorar, tarihleri tutar', () => {
  const before=reply('5 kişiyiz, 2 kadın 3 erkek, 1-5 Ekim 2026').details;
  const result=reply('Aslında 6 kişiyiz',before);
  assert.equal(result.details.personCount,6);
  assert.equal(result.details.femaleCount,null);
  assert.equal(result.details.maleCount,null);
  assert.equal(result.details.dateFrom,'2026-10-01');
  assert.equal(visitStage(result.details),'distribution');
});
test('çelişen dağılımı sessizce kabul etmez', () => {
  const result=reply('2 kadın 4 erkek',reply('5 kişiyiz').details);
  assert.match(result.text,/dağılım ise 6 ediyor/);
  assert.equal(visitStage(result.details),'distribution');
});
test('kişi sayısı olmayan kadın-erkek dağılımından toplamı hesaplar', () => {
  const result=reply('2 kadın 3 erkek');
  assert.equal(result.details.personCount,5);
  assert.equal(visitStage(result.details),'dates');
});
test('hepimiz kadınız ve hepimiz erkeğiz toplam kişiyi kullanır', () => {
  const previous=reply('3 kişiyiz').details;
  assert.equal(reply('Hepimiz kadınız',previous).details.femaleCount,3);
  assert.equal(reply('Hepimiz erkeğiz',previous).details.maleCount,3);
});
test('eşim ve ben ifadesinden cinsiyet çıkarmaz', () => {
  const result=reply('eşim ve ben');
  assert.equal(result.details.personCount,2);
  assert.equal(result.details.femaleCount,null);
  assert.equal(result.details.maleCount,null);
});
test('500 üzeri ve sıfır kişi kabul edilmez', () => {
  for (const message of ['501 kişiyiz','0 kişi']) assert.equal(reply(message).details.personCount,null);
});
test('geçmiş ve geçersiz tarih için doğru açıklama verir', () => {
  assert.match(reply('1-5 Eylül 2026').text,/geçmişte/);
  assert.match(reply('31 Şubat 2027').text,/Geçerli bir/);
  assert.equal(reply('31 Şubat 2027').details.dateFrom,'');
});
test('ters ve çok uzun tarih aralığını reddeder', () => {
  assert.match(validateVisitDates('2026-10-05','2026-10-01','2026-09-21')!,/Bitiş tarihi/);
  assert.match(validateVisitDates('2026-10-01','2027-01-01','2026-09-21')!,/60 günlük/);
});
test('yarın İstanbul tarihine göre hesaplanır', () => {
  assert.equal(reply('Yarın').details.dateFrom,'2026-09-22');
  assert.equal(localToday(new Date('2026-09-21T22:30:00Z')),'2026-09-22');
});
test('iki farklı ayı içeren tarih aralığını anlar', () => {
  const result=reply('30 Eylül - 3 Ekim 2027');
  assert.equal(result.details.dateFrom,'2027-09-30');
  assert.equal(result.details.dateTo,'2027-10-03');
});
test('tarih mesajındaki sayıyı kişi sayısı sanmaz', () => {
  const result=reply('1-5 Ekim 2026');
  assert.equal(result.details.personCount,null);
  assert.equal(result.details.dateFrom,'2026-10-01');
});
test('soru içindeki tarih ziyaret tercihi olarak kaydedilmez', () => {
  assert.equal(reply('1 Ekim 2026 için kontenjan var mı?').details.dateFrom,'');
});
test('bilinmeyen soruda açıkça sınırını belirtir ve bağlamı korur', () => {
  const previous=reply('5 kişiyiz').details;
  const result=reply('Yarın uçak saat kaçta kalkıyor?',previous);
  assert.deepEqual(result.details,previous);
  assert.match(result.text,/rezervasyonu yapmaz/);
});
test('takip ve iptal isteğini yapılmış işlem gibi sunmaz', () => {
  assert.equal(reply('Talebimi takip et').link?.href,'/talep');
  assert.match(reply('Randevumu iptal et').text,/iptal edemez/);
});
test('sıfırlama yalnız yerel sohbet bilgilerini temizler', () => {
  const result=reply('Yeni baştan başlayalım',reply('5 kişiyiz').details);
  assert.deepEqual(result.details,emptyVisit);
  assert.match(result.text,/Sohbetteki/);
});
test('bilgi talepleri randevu onayı iddiasına dönüşmez', () => {
  assert.match(reply('Randevu garantili mi?').text,/kesin randevu sözü veremem/);
  assert.match(reply('Nusuk nedir?').text,/resmî kanal Nusuk/);
  assert.match(reply('QR kodu ne zaman gelir?').text,/sohbet QR kodu üretmez/);
});
