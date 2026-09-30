/**
 * Faz 2 hazırlığı: WhatsApp Cloud API.
 *
 * Bugün kullanılan akış `wa.me` derin bağlantısıdır ve hiçbir onay
 * gerektirmez. Cloud API ise doğrulanmış işletme hesabı, şablon onayı ve
 * kullanıcı opt-in kaydı ister. Bu dosya yalnız sözleşmeyi tanımlar:
 * bayrak kapalıyken hiçbir ağ çağrısı yapılmaz ve hiçbir rota açılmaz.
 *
 * Açmadan önce kapanması gerekenler:
 * - Meta Business doğrulaması ve WhatsApp Business hesabı
 * - Şablon metinlerinin (aşağıdaki `WhatsappTemplate`) onaylanması
 * - Opt-in kaydının KVKK açık rıza metnine bağlanması
 * - Webhook doğrulama jetonu ve imza kontrolü
 */

export type WhatsappTemplate =
  | 'quote_received'
  | 'quote_contacted'
  | 'quote_confirmed'
  | 'appointment_scheduled'
  | 'qr_ready'
  | 'visit_reminder'
  | 'feedback_invite';

export type WhatsappTemplateMessage = {
  template: WhatsappTemplate;
  /** E.164 biçiminde alıcı numarası. */
  to: string;
  locale: 'tr' | 'en' | 'ar';
  /** Şablondaki sıralı değişkenler. Serbest metin gönderilmez. */
  variables: string[];
};

export type WhatsappCloudStatus = {
  enabled: boolean;
  configured: boolean;
  missing: string[];
};

export function getWhatsappCloudStatus(
  env: Record<string, string | undefined> = process.env,
): WhatsappCloudStatus {
  const missing = [
    ['WHATSAPP_PHONE_NUMBER_ID', env.WHATSAPP_PHONE_NUMBER_ID],
    ['WHATSAPP_ACCESS_TOKEN', env.WHATSAPP_ACCESS_TOKEN],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key as string);

  const configured = missing.length === 0;
  return {
    enabled: env.WHATSAPP_CLOUD_API_ENABLED === 'true' && configured,
    configured,
    missing,
  };
}

/**
 * Bayrak kapalıyken gönderim denenmez. Bilerek `never` dönmez: çağıran
 * taraf sonucu kontrol edip `wa.me` yedeğine düşebilsin diye.
 */
export function canSendTemplate(
  status: WhatsappCloudStatus = getWhatsappCloudStatus(),
): boolean {
  return status.enabled;
}
