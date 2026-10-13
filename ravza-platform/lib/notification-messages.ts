import type { NotificationKey } from './notification-catalog.ts';

/**
 * Bildirim metinleri.
 *
 * Her mesaj düz metindir; HTML gövde bundan üretilir. SMS metni ayrı yazılır
 * ve 160 karaktere sığacak şekilde kısa tutulur — uzun SMS ikiye bölünür ve
 * iki kredi harcar.
 */

export type MessageVariables = Record<string, string>;

export type RenderedMessage = {
  subject: string;
  body: string;
  sms: string;
};

type MessageTemplate = {
  subject: string;
  body: string;
  sms?: string;
};

/**
 * `{{ad}}` biçimindeki yer tutucuları doldurur. Karşılığı olmayan yer tutucu
 * boş dizeyle değiştirilir; müşteriye asla "{{isim}}" görünmez.
 */
export function fillTemplate(
  template: string,
  variables: MessageVariables,
): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

const signature = `\n\nRavza Randevu\nHac ve Umre rezervasyon merkezi`;

const templates: Record<NotificationKey, MessageTemplate> = {
  password_reset: {
    subject: 'Parola yenileme bağlantınız',
    body: `Merhaba {{ad}},

Ravza Randevu yönetim paneli için parola yenileme talebi aldık.

Yeni parola belirlemek için:
{{baglanti}}

Bu bağlantı 60 dakika geçerlidir ve yalnız bir kez kullanılabilir.

Bu talebi siz yapmadıysanız hiçbir şey yapmanıza gerek yok; parolanız değişmez. Ancak birileri hesabınızı deniyor olabilir, güçlü bir parola kullandığınızdan emin olun.${signature}`,
  },

  admin_new_login: {
    subject: 'Panelinize yeni bir cihazdan giriş yapıldı',
    body: `Merhaba {{ad}},

Yönetim paneline daha önce görülmemiş bir tarayıcıdan giriş yapıldı.

Zaman: {{zaman}}
Konum tahmini: {{konum}}

Bu sizseniz bir şey yapmanıza gerek yok. Siz değilseniz parolanızı hemen değiştirin.${signature}`,
  },

  profile_incomplete: {
    subject: 'Profilinizde birkaç bilgi eksik',
    body: `Merhaba {{ad}},

Hesabınızı açtınız ama rezervasyon oluşturmak için gereken şu bilgiler henüz boş:

{{eksikler}}

Bir dakikanızı alır: {{baglanti}}

Bilgiler tamamlandığında rezervasyon formları kendiliğinden dolar, her seferinde yeniden yazmazsınız.${signature}`,
  },

  order_received: {
    subject: 'Rezervasyon talebiniz alındı — {{paket}}',
    body: `Merhaba {{ad}},

Talebiniz bize ulaştı.

Paket: {{paket}}
Gidiş: {{gidis}}
Dönüş: {{donus}}
Yolcu sayısı: {{yolcu}}
Talep numarası: {{numara}}

Sıradaki adım: ödeme adımını tamamlamanız. Ödeme alınana kadar kontenjan geçici olarak sizin adınıza tutulur.

Talebinizi buradan izleyebilirsiniz: {{baglanti}}${signature}`,
    sms: 'Ravza Randevu: {{paket}} talebiniz alindi. Talep no {{numara}}. Detay: {{baglanti}}',
  },

  payment_reminder_1h: {
    subject: 'Talebinizi aldık — {{numara}}',
    body: `Merhaba {{ad}},

{{paket}} için açtığınız talep bize ulaştı. Şu anda uygunluğu inceliyoruz.

Bu sitede ödeme alınmaz; fiyat ve ödeme şekli görüşmemizde netleşir.

Talebinizi takip edin: {{baglanti}}

Acelesi varsa bu e-postayı yanıtlayın ya da {{telefon}} numarasından bize ulaşın.${signature}`,
  },

  payment_reminder_24h: {
    subject: 'Size ulaşmaya çalışıyoruz — {{numara}}',
    body: `Merhaba {{ad}},

{{paket}} talebiniz için sizinle bir gündür görüşemedik.

Talebiniz duruyor, kaybolmadı. Size en kolay hangi kanaldan ulaşabiliriz?

Talebinizi takip edin: {{baglanti}}
Telefon: {{telefon}}

Tarihi değiştirmek veya kişi sayısını güncellemek isterseniz de yazmanız yeterli.${signature}`,
    sms: 'Ravza Randevu: {{numara}} nolu talebinizde odeme bekleniyor. Kontenjan 48 saat daha tutulacak. {{baglanti}}',
  },

  payment_final_notice: {
    subject: 'Talebiniz kapanmak üzere — {{numara}}',
    body: `Merhaba {{ad}},

{{paket}} talebiniz için üç gündür görüşemedik ve talep kapanmak üzere.

Vazgeçtiyseniz bir şey yapmanıza gerek yok; talep kendiliğinden kapanır ve hiçbir ücret çıkmaz.

Devam etmek istiyorsanız: {{baglanti}}

Tarih veya kişi sayısı engel oluyorsa yazın — elimizde başka günler de var.${signature}`,
  },

  payment_confirmed: {
    subject: 'Talebiniz onaylandı — {{numara}}',
    body: `Merhaba {{ad}},

Görüşmemiz tamamlandı, talebiniz onaylandı.

Paket: {{paket}}
Gidiş: {{gidis}}
Dönüş: {{donus}}
Rezervasyon numarası: {{numara}}

Bundan sonra sizden istenecekler:
- Pasaport bilgileri (henüz vermediyseniz)
- Vize başvurusu için gerekli belgeler

Kalkıştan 30 gün önce belgeler için ayrıca hatırlatacağız. Rezervasyonunuz: {{baglanti}}${signature}`,
    sms: 'Ravza Randevu: Odemeniz onaylandi. Rezervasyon no {{numara}}. Detay: {{baglanti}}',
  },

  documents_due_30d: {
    subject: 'Yolculuğa 30 gün — belgeleri hazırlama zamanı',
    body: `Merhaba {{ad}},

{{gidis}} tarihli yolculuğunuza bir ay kaldı.

Şimdi kontrol etmeniz gerekenler:
- Pasaport geçerlilik süresi dönüş tarihinden sonra en az 6 ay olmalı
- Vize başvurusu için pasaport bilgileriniz sistemde eksiksiz olmalı
- Sağlık ve aşı gereklilikleri güncel olmalı

Eksik varsa buradan tamamlayabilirsiniz: {{baglanti}}

Bir sorunuz olursa bu e-postayı yanıtlamanız yeterli.${signature}`,
  },

  passenger_data_missing_14d: {
    subject: 'Eksik yolcu bilgisi var — {{numara}}',
    body: `Merhaba {{ad}},

Yolculuğunuza iki hafta kaldı ve bazı yolcuların bilgileri hâlâ eksik:

{{eksikler}}

Bu bilgiler olmadan vize ve Ravza izin işlemleri başlatılamıyor. Tamamlamak için: {{baglanti}}

Bilgileri bulmakta zorlanıyorsanız arayın, birlikte dolduralım.${signature}`,
    sms: 'Ravza Randevu: Kalkisa 14 gun kaldi, bazi yolcu bilgileri eksik. Tamamlayin: {{baglanti}}',
  },

  trip_summary_7d: {
    subject: 'Seyahat özetiniz — {{gidis}}',
    body: `Merhaba {{ad}},

Yolculuğunuza bir hafta kaldı. İşte özet:

Paket: {{paket}}
Gidiş: {{gidis}}
Dönüş: {{donus}}
Rezervasyon numarası: {{numara}}

Yanınıza almanız gerekenler:
- Pasaport ve vize çıktısı
- Rezervasyon numarası (bu e-postada var)
- Düzenli kullandığınız ilaçlar ve reçeteleri
- İhram (erkek yolcular için)

Tüm ayrıntılar hesabınızda: {{baglanti}}${signature}`,
  },

  ravza_status_3d: {
    subject: 'Ravza izin durumunuz',
    body: `Merhaba {{ad}},

Ravza-i Mutahhara ziyaretiniz için izin durumunuz:

{{durum}}

Ravza izinleri Suudi Arabistan tarafından kota ile veriliyor; başvuru yapmış olmak izin çıkacağı anlamına gelmiyor. İzin çıkarsa QR kodunuz hesabınızda görünür ve size ayrıca haber veririz.

Durumu izleyin: {{baglanti}}${signature}`,
    sms: 'Ravza Randevu: Ravza izin durumunuz guncellendi. Detay: {{baglanti}}',
  },

  departure_tomorrow: {
    subject: 'Yarın yola çıkıyorsunuz',
    body: `Merhaba {{ad}},

Yarın {{gidis}} tarihinde yolculuğunuz başlıyor.

Rezervasyon numarası: {{numara}}
Acil iletişim: {{telefon}}

Son kontrol:
- Pasaport ve vize yanınızda mı?
- Uçuş saatinden en az 3 saat önce havalimanında olun
- Bagaj kurallarını paket sayfasından teyit edin

Hayırlı yolculuklar dileriz.${signature}`,
    sms: 'Ravza Randevu: Yarin yolculugunuz var. Rez no {{numara}}. Acil: {{telefon}}. Pasaport ve vizenizi yaninıza alin.',
  },

  ravza_appointment_tomorrow: {
    subject: 'Yarın Ravza ziyaretiniz var',
    body: `Merhaba {{ad}},

Yarın Ravza ziyaretiniz var.

Tarih: {{ravzaTarihi}}
Saat: {{saat}}
Kapı: {{kapi}}

QR kodunuzu telefonunuzdan açık tutun; giriş kapısında istenecek. Randevu saatinden 30 dakika önce kapıda olun.

QR kodunuz: {{baglanti}}${signature}`,
    sms: 'Ravza Randevu: Yarin {{saat}} Ravza ziyaretiniz var. Kapi: {{kapi}}. QR kodunuz: {{baglanti}}',
  },

  return_feedback: {
    subject: 'Yolculuğunuz nasıl geçti?',
    body: `Merhaba {{ad}},

Umarız yolculuğunuz hayırlı geçmiştir.

Tek bir şey rica edeceğiz: nasıl geçtiğini bize yazar mısınız? İyi gitmeyen bir şey olduysa özellikle onu duymak istiyoruz — bir sonraki yolcu için düzeltebilmemizin tek yolu bu.

Değerlendirme: {{baglanti}}

Bu tür e-postaları almak istemiyorsanız hesap ayarlarınızdan kapatabilirsiniz.${signature}`,
  },

  admin_new_order: {
    subject: 'Yeni rezervasyon talebi — {{paket}}',
    body: `Yeni talep geldi.

Talep numarası: {{numara}}
Paket: {{paket}}
Müşteri: {{ad}} ({{eposta}})
Telefon: {{telefon}}
Yolcu sayısı: {{yolcu}}
Gidiş: {{gidis}}
Tutar: {{tutar}}

Panelde aç: {{baglanti}}`,
  },

  admin_payment_failed: {
    subject: 'Talebe ulaşılamadı — {{numara}}',
    body: `Bir talep için belirlenen sürede dönüş yapılamadı.

Talep numarası: {{numara}}
Müşteri: {{ad}} ({{eposta}})
Telefon: {{telefon}}
Ayrıntı: {{hata}}

Müşteri büyük ihtimalle bekliyor. Aramak iyi olur.

Panelde aç: {{baglanti}}`,
  },

  quote_received: {
    subject: 'Talebiniz alındı — {{kod}}',
    body: `Merhaba {{ad}},

Ravza ziyaret talebinizi aldık. Talep kodunuz: {{kod}}

Ziyaret: {{tarih}} · {{kisi}}

Ekibimiz sizinle WhatsApp veya telefonla iletişime geçecek. Talebinizin durumunu kod ve telefonunuzun son 4 hanesiyle takip edebilirsiniz:
{{baglanti}}

Talep göndermek randevunun kesinleştiği anlamına gelmez; randevu, ekibimiz onayladığında kesinleşir.${signature}`,
  },

  quote_qr_ready: {
    subject: 'Ravza QR bağlantınız hazır — {{kod}}',
    body: `Merhaba {{ad}},

Ravza randevunuz alındı. QR bağlantılarınız:
{{linkler}}

Önemli: QR kodları randevu saatinden 2 saat önce bu bağlantılarda yeşil olarak görünür. Ziyaret günü girişte QR kodunu görevliye okutun. Bağlantıyı yalnız grubunuzla paylaşın.

Talep takibi: {{baglanti}}${signature}`,
  },

  admin_new_quote: {
    subject: 'Yeni ziyaretçi talebi — {{kod}}',
    body: `Siteden yeni talep geldi.

Kod: {{kod}}
Ad: {{ad}}
Telefon: {{telefon}}
Ziyaret: {{tarih}} · {{kisi}}
Not: {{not}}


Panel: {{baglanti}}`,
  },

  admin_new_agency: {
    subject: 'Yeni acente başvurusu — {{sirket}}',
    body: `Yeni bir acente / şirket başvurdu.

Şirket: {{sirket}}
Vergi no: {{vergi}}
Yetkili: {{ad}} · {{telefon}} · {{eposta}}
İlk kontör talebi: {{kontor}}

Başvuruyu panelden onaylayabilir veya reddedebilirsiniz.

Panel: {{baglanti}}`,
  },

  admin_agency_credit_request: {
    subject: 'Kontör talebi — {{sirket}} · {{adet}}',
    body: `{{sirket}} {{adet}} kontör talep etti.

Talep eden: {{ad}}
Not: {{not}}
Güncel bakiye: {{bakiye}}


Panel: {{baglanti}}`,
  },

  agency_approved: {
    subject: 'Acente hesabınız onaylandı',
    body: `Merhaba {{ad}},

{{sirket}} için acente hesabınız onaylandı. {{kontorSatiri}}

Başvuruda belirlediğiniz e-posta ve şifreyle giriş yapabilirsiniz:
{{baglanti}}

Kullanım koşulları: {{kosullar}}${signature}`,
  },

  agency_rejected: {
    subject: 'Acente başvurunuz hakkında',
    body: `Merhaba {{ad}},

{{sirket}} adına yaptığınız acente başvurusu şu aşamada onaylanamadı.

Sebep: {{sebep}}

Sorularınız için bu e-postayı yanıtlayabilirsiniz.${signature}`,
  },

  agency_credits_loaded: {
    subject: 'Hesabınıza {{adet}} kontör yüklendi',
    body: `Merhaba {{ad}},

{{sirket}} hesabınıza {{adet}} kontör yüklendi.
Güncel bakiye: {{bakiye}} kontör
Açıklama: {{not}}

Randevu almak için: {{baglanti}}${signature}`,
  },

  agency_credit_request_rejected: {
    subject: 'Kontör talebiniz hakkında',
    body: `Merhaba {{ad}},

{{adet}} kontörlük talebiniz onaylanmadı.
Sebep: {{sebep}}

Sorularınız için bu e-postayı yanıtlayabilirsiniz.${signature}`,
  },

  agency_booking_ready: {
    subject: 'Randevunuz alındı — {{tarih}}',
    body: `Merhaba {{ad}},

{{sirket}} için Ravza randevusu alındı.
Grup: {{grup}}
Tarih: {{tarih}}
Düşülen kontör: {{adet}} · Kalan bakiye: {{bakiye}}

QR bağlantıları:
{{linkler}}

QR kodları randevu saatinden 2 saat önce bağlantılarda yeşil olarak görünür. Bağlantıları yolcularınıza şimdiden iletebilirsiniz.

Panel: {{baglanti}}${signature}`,
  },

  agency_member_invited: {
    subject: '{{sirket}} acente paneline davet edildiniz',
    body: `Merhaba {{ad}},

{{davetEden}} sizi {{sirket}} acente paneline ekledi.

Giriş adresi: {{baglanti}}
E-posta: {{eposta}}
Geçici şifre: {{sifre}}

Güvenliğiniz için ilk girişten sonra panelin altındaki "Şifre değiştir" bölümünden yeni şifre belirleyin.${signature}`,
  },

  agency_password_reset: {
    subject: 'Acente paneli şifreniz sıfırlandı',
    body: `Merhaba {{ad}},

{{sirket}} acente paneli şifreniz sıfırlandı.

Giriş adresi: {{baglanti}}
Geçici şifre: {{sifre}}

İlk girişten sonra "Şifre değiştir" bölümünden yeni şifre belirleyin. Bu işlemi siz istemediyseniz bize hemen bildirin.${signature}`,
  },

  admin_daily_digest: {
    subject: 'Günlük özet — {{tarih}}',
    body: `Dünün özeti:

Yeni talep: {{yeniTalep}}
Onaylanan ödeme: {{onaylananOdeme}}
Bekleyen ödeme: {{bekleyenOdeme}}
Yaklaşan kalkış (7 gün içinde): {{yaklasanKalkis}}
Eksik yolcu bilgisi olan rezervasyon: {{eksikBilgi}}

Panel: {{baglanti}}`,
  },
};

export function renderMessage(
  key: NotificationKey,
  variables: MessageVariables,
): RenderedMessage {
  const template = templates[key];
  const body = fillTemplate(template.body, variables);
  return {
    subject: fillTemplate(template.subject, variables),
    body,
    // SMS metni yazılmamışsa gövdenin ilk satırı kullanılmaz; boş döner ve
    // SMS kanalı bu bildirim için atlanır.
    sms: template.sms ? fillTemplate(template.sms, variables) : '',
  };
}

/** Düz metni basit, güvenli HTML gövdeye çevirir. */
export function toHtmlBody(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#19613f">$1</a>',
  );
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.65;color:#1c2b23;max-width:560px">${linked
    .split('\n\n')
    .map((paragraph) => `<p style="margin:0 0 1em">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`;
}
