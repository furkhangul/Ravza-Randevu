import { listAppointmentPackages } from '@/db/appointment-packages';
import {
  appointmentPackageCodes,
  packagePersonCount,
} from '@/lib/appointment-packages';
import type { AssistantPackage } from '@/components/order-assistant';

/**
 * Asistan her genel sayfada bulunduğu için katalog okunamadığında bile
 * çalışmalıdır. Veritabanı erişilemezse fiyatsız taban katmanlar
 * kullanılır: kullanıcı yine talep oluşturabilir, kartta fiyat yerine
 * "WhatsApp'tan teyit" mesajı görünür.
 */
const fallbackNames: Record<string, { tr: string; en: string; ar: string }> = {
  solo: { tr: 'Tek Kişilik Ziyaret', en: 'Single Visit', ar: 'زيارة فردية' },
  family: { tr: 'Aile Paketi', en: 'Family Package', ar: 'باقة العائلة' },
  group: { tr: 'Grup Paketi', en: 'Group Package', ar: 'باقة المجموعة' },
  kafile: { tr: 'Kafile Paketi', en: 'Convoy Package', ar: 'باقة القافلة' },
  agency: { tr: 'Acente Paketi', en: 'Agency Package', ar: 'باقة الوكالة' },
  custom: { tr: 'Özel / Kurumsal', en: 'Custom / Corporate', ar: 'خاصة / مؤسسية' },
};

export function fallbackAssistantPackages(): AssistantPackage[] {
  return appointmentPackageCodes.map((code) => ({
    code,
    name: fallbackNames[code],
    personCount: packagePersonCount[code],
    pricePerPersonMinor: null,
  }));
}

export async function loadAssistantPackages(): Promise<AssistantPackage[]> {
  try {
    const records = await listAppointmentPackages({ publishedOnly: true });
    if (records.length === 0) return fallbackAssistantPackages();
    return records.map((record) => ({
      code: record.code,
      name: {
        tr: record.name.tr,
        en: record.name.en || record.name.tr,
        ar: record.name.ar || record.name.tr,
      },
      personCount: record.personCount,
      pricePerPersonMinor: record.pricePerPersonMinor,
    }));
  } catch {
    return fallbackAssistantPackages();
  }
}
