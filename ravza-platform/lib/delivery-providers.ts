import { toHtmlBody } from './notification-messages.ts';

/**
 * E-posta ve SMS sağlayıcı bağlantıları.
 *
 * İkisi de ortam değişkenine bağlıdır ve **varsayılan olarak kapalıdır**.
 * Anahtar yoksa mesaj gönderilmez; kuyrukta `skipped` olarak işaretlenir ve
 * panelde "sağlayıcı bağlanmadı" diye görünür. Böylece yapılandırma eksikken
 * hiçbir şey sessizce kaybolmaz.
 */

export type DeliveryResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string; retryable: boolean };

export type EmailConfig = {
  apiKey: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
};

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.EMAIL_API_KEY?.trim();
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!apiKey || !fromAddress) return null;
  return {
    apiKey,
    fromAddress,
    fromName: process.env.EMAIL_FROM_NAME?.trim() || 'Ravza Randevu',
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || fromAddress,
  };
}

export type SmsConfig = {
  apiKey: string;
  sender: string;
};

export function getSmsConfig(): SmsConfig | null {
  const apiKey = process.env.SMS_API_KEY?.trim();
  const sender = process.env.SMS_SENDER_ID?.trim();
  if (!apiKey || !sender) return null;
  return { apiKey, sender };
}

/**
 * E-posta gönderimi (Resend HTTP API).
 *
 * Cloudflare Workers'ta SMTP kullanılamaz, bu yüzden HTTP tabanlı bir
 * sağlayıcı gerekir. Sağlayıcı değişirse yalnız bu fonksiyon değişir.
 */
export async function sendEmail(input: {
  to: string;
  toName: string;
  subject: string;
  body: string;
}): Promise<DeliveryResult> {
  const config = getEmailConfig();
  if (!config) return { ok: false, error: 'email_provider_unconfigured', retryable: false };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: [input.toName ? `${input.toName} <${input.to}>` : input.to],
        reply_to: config.replyTo,
        subject: input.subject,
        text: input.body,
        html: toHtmlBody(input.body),
      }),
    });

    if (response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
      };
      return { ok: true, providerId: result.id ?? '' };
    }

    // 4xx kalıcı hata (adres bozuk, alan adı doğrulanmamış), 5xx geçici.
    return {
      ok: false,
      error: `email_http_${response.status}`,
      retryable: response.status >= 500 || response.status === 429,
    };
  } catch {
    return { ok: false, error: 'email_network_error', retryable: true };
  }
}

/**
 * SMS gönderimi (Netgsm REST API — Türkiye'de en yaygın olanı).
 *
 * Gönderici adı (`SMS_SENDER_ID`) operatörde önceden onaylı olmalıdır;
 * onaysız başlıkla gönderim reddedilir.
 */
export async function sendSms(input: {
  to: string;
  body: string;
}): Promise<DeliveryResult> {
  const config = getSmsConfig();
  if (!config) return { ok: false, error: 'sms_provider_unconfigured', retryable: false };

  const number = normalizePhone(input.to);
  if (!number) return { ok: false, error: 'sms_invalid_number', retryable: false };

  try {
    const response = await fetch('https://api.netgsm.com.tr/sms/rest/v2/send', {
      method: 'POST',
      headers: {
        authorization: `Basic ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        msgheader: config.sender,
        messages: [{ msg: input.body, no: number }],
        encoding: 'TR',
        iysfilter: '', // İşlem bildirimi: İYS filtresi uygulanmaz.
      }),
    });

    if (response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        jobid?: string;
      };
      return { ok: true, providerId: result.jobid ?? '' };
    }
    return {
      ok: false,
      error: `sms_http_${response.status}`,
      retryable: response.status >= 500 || response.status === 429,
    };
  } catch {
    return { ok: false, error: 'sms_network_error', retryable: true };
  }
}

/**
 * Türk numaralarını operatörün beklediği `905XXXXXXXXX` biçimine getirir.
 * Tanınmayan biçimde null döner — yanlış numaraya SMS gitmesindense hiç
 * gitmemesi iyidir.
 */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `9${digits}`;
  if (digits.startsWith('5') && digits.length === 10) return `90${digits}`;
  return null;
}
