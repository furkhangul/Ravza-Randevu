/**
 * Otomatik bildirim kataloğu.
 *
 * Burası saf veri ve saf mantıktır: veritabanı, ağ veya ortam değişkeni
 * kullanmaz. Hangi olayda, hangi kanaldan, ne zaman, hangi metnin gideceği
 * yalnız burada tanımlanır — böylece takvim testlerle doğrulanabilir ve
 * metinler tek yerden düzenlenir.
 */

export type NotificationChannel = 'email' | 'sms';

export type NotificationAudience = 'customer' | 'admin' | 'agency';

export type NotificationKey =
  // Hesap
  | 'password_reset'
  | 'admin_new_login'
  | 'profile_incomplete'
  // Rezervasyon yaşam döngüsü
  | 'order_received'
  | 'payment_reminder_1h'
  | 'payment_reminder_24h'
  | 'payment_final_notice'
  | 'payment_confirmed'
  | 'documents_due_30d'
  | 'passenger_data_missing_14d'
  | 'trip_summary_7d'
  | 'ravza_status_3d'
  | 'departure_tomorrow'
  | 'ravza_appointment_tomorrow'
  | 'return_feedback'
  // Yönetim
  | 'admin_new_order'
  | 'admin_payment_failed'
  | 'admin_daily_digest'
  // Ziyaretçi talebi
  | 'quote_received'
  | 'quote_qr_ready'
  | 'admin_new_quote'
  // Acente / şirket
  | 'admin_new_agency'
  | 'admin_agency_credit_request'
  | 'agency_approved'
  | 'agency_rejected'
  | 'agency_credits_loaded'
  | 'agency_credit_request_rejected'
  | 'agency_booking_ready'
  | 'agency_member_invited'
  | 'agency_password_reset';

/**
 * Bildirimin ne zaman gönderileceği.
 *
 * - `immediate`   : olay anında.
 * - `afterCreate` : rezervasyon oluşturulduktan N dakika sonra.
 * - `beforeDate`  : belirtilen tarihten N gün önce, yerel saat 10:00.
 * - `afterDate`   : belirtilen tarihten N gün sonra, yerel saat 10:00.
 */
export type NotificationTiming =
  | { kind: 'immediate' }
  | { kind: 'afterCreate'; minutes: number }
  | { kind: 'beforeDate'; anchor: DateAnchor; days: number; hour: number }
  | { kind: 'afterDate'; anchor: DateAnchor; days: number; hour: number };

export type DateAnchor = 'departureDate' | 'returnDate' | 'ravzaVisitDate';

export type NotificationDefinition = {
  key: NotificationKey;
  audience: NotificationAudience;
  channels: NotificationChannel[];
  timing: NotificationTiming;
  /** İşlem bildirimi mi, pazarlama mı — pazarlama olanlar onaya bağlıdır. */
  transactional: boolean;
  /** Bu bildirimin hangi durumdaki siparişler için anlamlı olduğu. */
  onlyStatuses?: ReadonlyArray<
    'awaiting_payment' | 'payment_pending' | 'confirmed' | 'cancelled'
  >;
  title: string;
  /** Panelde "bu ne zaman gider" diye okunacak açıklama. */
  description: string;
};

/**
 * Takvimin tamamı. Sıralama, panelde göründüğü sıradır: önce hesap, sonra
 * rezervasyon akışı zaman sırasıyla, en sonda yönetim bildirimleri.
 */
export const notificationCatalog: readonly NotificationDefinition[] = [
  {
    key: 'password_reset',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Parola yenileme bağlantısı',
    description:
      'Yönetici "parolamı unuttum" dediğinde anında gider. Bağlantı 60 dakika geçerlidir ve bir kez kullanılır.',
  },
  {
    key: 'admin_new_login',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Yeni cihazdan yönetici girişi',
    description:
      'Panele daha önce görülmemiş bir tarayıcıdan girildiğinde anında gider. İzinsiz erişimi erken yakalamak içindir.',
  },
  {
    key: 'profile_incomplete',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'afterCreate', minutes: 60 * 24 * 3 },
    transactional: true,
    title: 'Profil bilgileriniz eksik',
    description:
      'Hesap açıldıktan 3 gün sonra zorunlu profil alanları hâlâ boşsa bir kez gönderilir. Tekrarlanmaz.',
  },

  {
    key: 'order_received',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Rezervasyon talebiniz alındı',
    description:
      'Talep oluşur oluşmaz gider. Paket, tarih, yolcu sayısı ve sıradaki adımı özetler.',
  },
  {
    key: 'payment_reminder_1h',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'afterCreate', minutes: 60 },
    transactional: true,
    onlyStatuses: ['awaiting_payment'],
    title: 'Talebinizi aldık, size ulaşacağız',
    description:
      'Talepten 1 saat sonra hâlâ görüşme başlamadıysa gider. Nazik ilk hatırlatma; ödeme istemez.',
  },
  {
    key: 'payment_reminder_24h',
    audience: 'customer',
    channels: ['email', 'sms'],
    timing: { kind: 'afterCreate', minutes: 60 * 24 },
    transactional: true,
    onlyStatuses: ['awaiting_payment'],
    title: 'Size ulaşamadık',
    description:
      'Talepten 24 saat sonra hâlâ görüşülemediyse e-posta ve SMS birlikte gider. Alternatif iletişim kanallarını verir.',
  },
  {
    key: 'payment_final_notice',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'afterCreate', minutes: 60 * 72 },
    transactional: true,
    onlyStatuses: ['awaiting_payment'],
    title: 'Talebiniz kapanmak üzere',
    description:
      'Talepten 72 saat sonra hâlâ görüşülemediyse son bilgilendirme gider. Sonrasında talep kapanır.',
  },
  {
    key: 'payment_confirmed',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    onlyStatuses: ['confirmed'],
    title: 'Talebiniz onaylandı',
    description:
      'Görüşme tamamlanıp talep onaylandığı anda gider. Talep numarası ve sıradaki adımları içerir.',
  },
  {
    key: 'documents_due_30d',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'beforeDate', anchor: 'departureDate', days: 30, hour: 10 },
    transactional: true,
    onlyStatuses: ['confirmed'],
    title: 'Belgelerinizi hazırlama zamanı',
    description:
      'Kalkıştan 30 gün önce sabah 10:00’da gider. Pasaport geçerliliği, vize ve aşı durumunu hatırlatır.',
  },
  {
    key: 'passenger_data_missing_14d',
    audience: 'customer',
    channels: ['email', 'sms'],
    timing: { kind: 'beforeDate', anchor: 'departureDate', days: 14, hour: 10 },
    transactional: true,
    onlyStatuses: ['confirmed'],
    title: 'Eksik yolcu bilgisi var',
    description:
      'Kalkıştan 14 gün önce, yolcuların pasaport veya doğum tarihi eksikse gider. Bilgi tamsa gönderilmez.',
  },
  {
    key: 'trip_summary_7d',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'beforeDate', anchor: 'departureDate', days: 7, hour: 10 },
    transactional: true,
    onlyStatuses: ['confirmed'],
    title: 'Seyahat özetiniz',
    description:
      'Kalkıştan 7 gün önce gider. Otel, program, uçuş ve yanınıza almanız gerekenler.',
  },
  {
    key: 'ravza_status_3d',
    audience: 'customer',
    channels: ['email', 'sms'],
    timing: { kind: 'beforeDate', anchor: 'departureDate', days: 3, hour: 10 },
    transactional: true,
    onlyStatuses: ['confirmed'],
    title: 'Ravza izin durumunuz',
    description:
      'Kalkıştan 3 gün önce gider. İzin çıktıysa QR bağlantısı, çıkmadıysa dürüst bir durum bildirimi.',
  },
  {
    key: 'departure_tomorrow',
    audience: 'customer',
    channels: ['sms', 'email'],
    timing: { kind: 'beforeDate', anchor: 'departureDate', days: 1, hour: 12 },
    transactional: true,
    onlyStatuses: ['confirmed'],
    title: 'Yarın yolculuk var',
    description:
      'Kalkıştan 1 gün önce öğlen gider. Buluşma saati, terminal ve acil iletişim numarası.',
  },
  {
    key: 'ravza_appointment_tomorrow',
    audience: 'customer',
    channels: ['sms'],
    timing: { kind: 'beforeDate', anchor: 'ravzaVisitDate', days: 1, hour: 18 },
    transactional: true,
    onlyStatuses: ['confirmed'],
    title: 'Yarın Ravza ziyaretiniz',
    description:
      'Ravza ziyaretinden 1 gün önce akşam SMS gider. Saat, kapı ve QR hatırlatması.',
  },
  {
    key: 'return_feedback',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'afterDate', anchor: 'returnDate', days: 2, hour: 11 },
    transactional: false,
    onlyStatuses: ['confirmed'],
    title: 'Yolculuğunuz nasıl geçti?',
    description:
      'Dönüşten 2 gün sonra gider. Tek soruluk değerlendirme daveti — pazarlama sayıldığı için onay vermemiş müşteriye gönderilmez.',
  },

  {
    key: 'admin_new_order',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Yeni rezervasyon talebi',
    description:
      'Her yeni talepte yönetici e-postasına anında düşer.',
  },
  {
    key: 'admin_payment_failed',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Talebe ulaşılamadı',
    description:
      'Bir talebe belirlenen sürede dönüş yapılamadığında anında gider; müşteriye siz ulaşabilesiniz diye.',
  },
  {
    key: 'admin_daily_digest',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Günlük özet',
    description:
      'Her sabah 08:00’de bir önceki günün talepleri, ödemeleri ve bekleyen işleri.',
  },
  {
    key: 'quote_received',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Talebiniz alındı',
    description:
      'Ziyaretçi talep gönderdiğinde (e-posta yazdıysa) talep kodu ve takip bağlantısıyla anında gider.',
  },
  {
    key: 'quote_qr_ready',
    audience: 'customer',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Ravza QR bağlantınız hazır',
    description:
      'Talep için RawdahBooking randevusu alınıp QR bağlantısı oluşunca anında gider.',
  },
  {
    key: 'admin_new_quote',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Yeni ziyaretçi talebi',
    description:
      'Siteden her yeni talepte yönetici e-postasına anında düşer.',
  },
  {
    key: 'admin_new_agency',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Yeni acente başvurusu',
    description:
      'Bir acente veya şirket başvurduğunda anında gider.',
  },
  {
    key: 'admin_agency_credit_request',
    audience: 'admin',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Acente kontör talebi',
    description:
      'Onaylı bir acente kontör talep ettiğinde anında gider.',
  },
  {
    key: 'agency_approved',
    audience: 'agency',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Acente hesabınız onaylandı',
    description:
      'Başvuru onaylanınca acente sahibine anında gider; yüklenen kontörü de bildirir.',
  },
  {
    key: 'agency_rejected',
    audience: 'agency',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Acente başvurunuz hakkında',
    description:
      'Başvuru reddedilince sebebiyle birlikte acente sahibine gider.',
  },
  {
    key: 'agency_credits_loaded',
    audience: 'agency',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Kontör yüklendi',
    description:
      'Kontör talebi onaylanınca veya elle kontör eklenince acente sahibine gider.',
  },
  {
    key: 'agency_credit_request_rejected',
    audience: 'agency',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Kontör talebiniz hakkında',
    description:
      'Kontör talebi reddedilince acente sahibine gider.',
  },
  {
    key: 'agency_booking_ready',
    audience: 'agency',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Randevunuz alındı',
    description:
      'Acente randevu aldığında QR bağlantılarıyla birlikte işlemi yapan kullanıcıya gider.',
  },
  {
    key: 'agency_member_invited',
    audience: 'agency',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Acente paneline davet',
    description:
      'Acente sahibi yeni çalışan eklediğinde çalışana geçici şifreyle gider.',
  },
  {
    key: 'agency_password_reset',
    audience: 'agency',
    channels: ['email'],
    timing: { kind: 'immediate' },
    transactional: true,
    title: 'Şifreniz sıfırlandı',
    description:
      'Yönetici veya acente sahibi şifre sıfırladığında kullanıcıya geçici şifreyle gider.',
  },
] as const;

const catalogByKey = new Map(
  notificationCatalog.map((definition) => [definition.key, definition]),
);

export function getNotification(key: NotificationKey): NotificationDefinition {
  const definition = catalogByKey.get(key);
  if (!definition) throw new Error(`unknown_notification_${key}`);
  return definition;
}

export function notificationsForAudience(
  audience: NotificationAudience,
): NotificationDefinition[] {
  return notificationCatalog.filter(
    (definition) => definition.audience === audience,
  );
}
