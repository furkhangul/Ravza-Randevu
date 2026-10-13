export type LegalProfile = {
  entityType: string;
  companyName: string;
  brandName: string;
  authorizedPerson: string;
  mersisNumber: string;
  taxOffice: string;
  taxNumber: string;
  address: string;
  contactEmail: string;
  kvkkEmail: string;
  kepAddress: string;
  contactPhone: string;
  whatsappNumber: string;
  agencyTitle: string;
  agencyLicenceNumber: string;
  complete: boolean;
  missingLabels: string[];
};

/**
 * Seyahat Acentaları Yönetmeliği m.17/3 uyarınca acentenin işletme belge
 * numarası ve unvanı, online satış kanalının açılış sayfasında ve diğer
 * sayfaların alt bölümünde gösterilmelidir.
 *
 * Belge doğrulanmadan numara yayımlamak, olmayan bir yetkiyi beyan etmek
 * olur. Bu yüzden gösterim hem numaranın girilmiş olmasına hem de
 * `TRAVEL_AGENCY_AUTHORITY_VERIFIED=true` kapısına bağlıdır.
 */
export function getAgencyLicenceDisplay(
  env: NodeJS.ProcessEnv = process.env,
): { display: false } | { display: true; title: string; licenceNumber: string } {
  const verified = env.TRAVEL_AGENCY_AUTHORITY_VERIFIED === 'true';
  const licenceNumber = value(env, 'TRAVEL_AGENCY_LICENCE_NUMBER');
  const title =
    value(env, 'LEGAL_AGENCY_TITLE') || value(env, 'LEGAL_COMPANY_NAME');
  if (!verified || !licenceNumber || !title) return { display: false };
  return { display: true, title, licenceNumber };
}

function value(env: NodeJS.ProcessEnv, key: string) {
  return env[key]?.trim() ?? '';
}

export function getLegalProfile(
  env: NodeJS.ProcessEnv = process.env,
): LegalProfile {
  const fields = {
    entityType: value(env, 'LEGAL_ENTITY_TYPE') || 'Limited Şirket',
    companyName: value(env, 'LEGAL_COMPANY_NAME'),
    brandName: value(env, 'LEGAL_BRAND_NAME') || 'Ravza Randevu',
    authorizedPerson: value(env, 'LEGAL_AUTHORIZED_PERSON'),
    mersisNumber: value(env, 'LEGAL_MERSIS_NUMBER'),
    taxOffice: value(env, 'LEGAL_TAX_OFFICE'),
    taxNumber: value(env, 'LEGAL_TAX_NUMBER'),
    address: value(env, 'LEGAL_ADDRESS'),
    contactEmail: 'info@ravzarandevu.com.tr',
    kvkkEmail: 'info@ravzarandevu.com.tr',
    kepAddress: value(env, 'LEGAL_KEP_ADDRESS'),
    contactPhone: value(env, 'LEGAL_CONTACT_PHONE') || '+90 555 056 19 07',
    whatsappNumber:
      value(env, 'LEGAL_WHATSAPP_NUMBER') || '+90 555 056 19 07',
    agencyTitle: value(env, 'LEGAL_AGENCY_TITLE'),
    agencyLicenceNumber: value(env, 'TRAVEL_AGENCY_LICENCE_NUMBER'),
  };
  const required: Array<[keyof typeof fields, string]> = [
    ['companyName', 'ticari unvan'],
    ['mersisNumber', 'MERSİS numarası'],
    ['taxOffice', 'vergi dairesi'],
    ['taxNumber', 'vergi numarası'],
    ['address', 'şirket adresi'],
    ['contactEmail', 'iletişim e-postası'],
    ['kvkkEmail', 'KVKK başvuru e-postası'],
  ];
  const missingLabels = required
    .filter(([key]) => !fields[key])
    .map(([, label]) => label);
  return { ...fields, complete: missingLabels.length === 0, missingLabels };
}

/**
 * Eksik alan için köşeli parantezli "TODO" görünümü yerine sade bir ifade
 * döndürür: metin yayımlanmadan önce bu alanların doldurulacağını
 * `LegalDraftBanner` zaten belirtiyor.
 */
export function legalValue(value: string, label: string) {
  return value || `${label} yayımlanmadan önce eklenecektir`;
}

