import Link from 'next/link';
import { Building2, LifeBuoy, Mail } from 'lucide-react';
import { InfoPage, InfoSection } from '@/components/info-page';
import { LegalDraftBanner } from '@/components/legal-draft-banner';
import { getLegalProfile, legalValue } from '@/lib/legal-config';

export default function ContactPage() {
  const profile = getLegalProfile();
  const channels = [
    {
      icon: Building2,
      title: 'Acente başvurusu',
      text: `Firma ve yetki değerlendirmesi · ${legalValue(profile.contactEmail, 'iletişim e-postası')}`,
    },
    {
      icon: LifeBuoy,
      title: 'Operasyon desteği',
      text: 'Panel içinden sipariş kimliğiyle güvenli takip',
    },
    {
      icon: Mail,
      title: 'Yasal talepler',
      text: legalValue(profile.kvkkEmail, 'KVKK e-postası'),
    },
  ];
  return (
    <InfoPage
      eyebrow="İletişim"
      title="Doğru konu, doğru kanal."
      intro="Destek ve yasal talepler hassas veriyi açık e-postaya taşımadan, doğrulanabilir kanallardan yürütülür."
    >
      <LegalDraftBanner profile={profile} />
      <div className="grid gap-4 md:grid-cols-3">
        {channels.map(({ icon: Icon, title, text }) => (
          <section
            key={title}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <Icon className="size-5 text-primary" />
            <h2 className="mt-4 font-serif text-xl">{title}</h2>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {text}
            </p>
          </section>
        ))}
      </div>
      <InfoSection title="Destek talebi">
        <p>
          Acente kullanıcıları operasyon taleplerini{' '}
          <Link
            href="/dashboard/support"
            className="font-medium text-primary underline"
          >
            destek ekranından
          </Link>{' '}
          iletebilir; talep kaydı işlem geçmişine bağlanır. Güvenliğiniz için
          mesajlara parola, pasaport görseli veya kart bilgisi eklemeyin.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
