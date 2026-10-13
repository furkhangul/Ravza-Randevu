import { ShieldCheck } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AppUser } from '@/lib/app-auth';
import type { LegalProfile } from '@/lib/legal-config';

const ROLE_LABEL: Record<AppUser['role'], string> = {
  SUPER_ADMIN: 'Süper yönetici',
  AGENCY_ADMIN: 'Yönetici',
  STAFF: 'Personel',
};

const AUTH_LABEL: Record<AppUser['authSource'], string> = {
  password: 'Kullanıcı adı ve parola',
  google: 'Google ile giriş',
  chatgpt: 'ChatGPT uygulaması',
};

/**
 * Firma bilgileri yasal profilden (Cloudflare ortam değişkenleri) okunur;
 * aynı bilgiler sözleşme, KVKK ve alt bilgi metinlerinde de kullanılır. Bu
 * yüzden burada değil, tek kaynaktan değiştirilir.
 */
export function ProfileForm({
  profile,
  user,
}: {
  profile: LegalProfile;
  user: AppUser;
}) {
  const rows: Array<[string, string]> = [
    ['Marka', profile.brandName],
    ['Ticari unvan', profile.companyName],
    ['Şirket türü', profile.entityType],
    ['Yetkili kişi', profile.authorizedPerson],
    ['E-posta', profile.contactEmail],
    ['Telefon', profile.contactPhone],
    ['WhatsApp', profile.whatsappNumber],
    ['Adres', profile.address],
    ['Vergi dairesi', profile.taxOffice],
    ['Vergi numarası', profile.taxNumber],
    ['MERSİS', profile.mersisNumber],
    ['TÜRSAB belge no', profile.agencyLicenceNumber],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_.65fr]">
      <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Firma bilgileri</CardTitle>
          <CardDescription>
            Sözleşme, KVKK metni ve site alt bilgisinde kullanılan resmî
            bilgiler. Değişiklik için sistem yöneticisine iletin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="text-end font-medium">
                  {value || (
                    <span className="font-normal text-[color:var(--warning)]">
                      eksik
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card className="border-0 bg-primary text-primary-foreground">
        <CardHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-white/10">
            <ShieldCheck />
          </div>
          <CardTitle className="font-serif text-2xl">Oturumunuz</CardTitle>
          <CardDescription className="text-primary-foreground/65">
            Bu panele şu anda giriş yapmış hesap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-primary-foreground/80">
          <p className="flex justify-between gap-4">
            <span>Ad</span>
            <strong className="text-end">
              {user.fullName || user.displayName || '—'}
            </strong>
          </p>
          <p className="flex justify-between gap-4">
            <span>E-posta</span>
            <strong className="break-all text-end">{user.email}</strong>
          </p>
          <p className="flex justify-between gap-4">
            <span>Rol</span>
            <strong>{ROLE_LABEL[user.role]}</strong>
          </p>
          <p className="flex justify-between gap-4">
            <span>Giriş yöntemi</span>
            <strong>{AUTH_LABEL[user.authSource]}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
