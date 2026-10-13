import { NotificationCenter } from '@/components/notification-center';
import { PanelTabs, readTab } from '@/components/panel-tabs';
import { ProfileForm } from '@/components/profile-form';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';
import { SupportForm } from '@/components/support-form';
import { requireAppUser } from '@/lib/app-auth';
import { getLegalProfile } from '@/lib/legal-config';

export const dynamic = 'force-dynamic';

const tabs = [
  { key: 'firma', label: 'Firma' },
  { key: 'bildirim', label: 'Bildirim kanalları' },
  { key: 'destek', label: 'Destek' },
  { key: 'yasal', label: 'Yasal durum' },
];

export default async function PanelSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await readTab(
    searchParams,
    tabs.map((tab) => tab.key),
  );
  const user = await requireAppUser('/panel/ayarlar');
  const profile = getLegalProfile();

  return (
    <SectionShell
      title="Ayarlar"
      eyebrow="Hesap, kanallar ve yasal durum"
      activePath="/panel/ayarlar"
    >
      <ScreenGuide
        purpose="Firma bilgileri, bildirim kanalları, destek talepleri ve yasal doğrulama durumu tek ekranda toplandı."
        actions={[
          'Firma ve yetkili bilgilerini görmek',
          'Bildirim kanallarını açıp kapatmak',
          'Destek talebi açmak ve geçmişi görmek',
        ]}
        effect="Değişiklikler yerel olarak kaydedilir ve ilgili ekranlara yansır."
        limit="Yasal durum salt okunurdur; kapılar belge doğrulandığında ortam değişkeniyle açılır."
      />
      <PanelTabs basePath="/panel/ayarlar" current={current} tabs={tabs} />

      {current === 'firma' ? <ProfileForm profile={profile} user={user} /> : null}
      {current === 'bildirim' ? <NotificationCenter /> : null}
      {current === 'destek' ? <SupportForm /> : null}
      {current === 'yasal' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <h2 className="font-serif text-xl">Tüzel kişilik</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Ticari unvan', profile.companyName],
                ['Yetkili kişi', profile.authorizedPerson],
                ['Vergi dairesi', profile.taxOffice],
                ['Vergi numarası', profile.taxNumber],
                ['MERSİS', profile.mersisNumber],
                ['Adres', profile.address],
                ['İletişim e-postası', profile.contactEmail],
                ['KVKK e-postası', profile.kvkkEmail],
                ['Telefon', profile.contactPhone],
                ['WhatsApp', profile.whatsappNumber],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="text-end">
                    {value || (
                      <span className="text-[color:var(--warning)]">
                        eksik
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {profile.missingLabels.length > 0 ? (
            <div className="rounded-2xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/8 p-5 text-sm">
              <p className="font-medium">Yayın öncesi tamamlanacaklar</p>
              <p className="mt-1 text-muted-foreground">
                {profile.missingLabels.join(', ')}. Bu alanlar `.env` üzerinden
                girilir; koda yazılmaz.
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-black/5 bg-white p-5 text-sm leading-6">
            <h2 className="font-serif text-xl">Tahsilat</h2>
            <p className="mt-2 text-muted-foreground">
              Hizmet bedeli ve kapsamı WhatsApp, telefon veya e-posta görüşmesinde netleştirilir.
            </p>
          </div>
        </div>
      ) : null}
    </SectionShell>
  );
}


