import Link from "@/components/safe-link";
import { ArrowUpRight, Mail, MessageCircle, Phone, Search } from "lucide-react";
import { InfoPage, InfoSection } from "@/components/info-page";
import { getLegalProfile } from "@/lib/legal-config";

export const metadata = {
  title: "İletişim · Ravza Randevu",
  description:
    "Ravza ziyaret talebiniz hakkında ekibimizle iletişim kurun veya mevcut talebinizi takip edin.",
  alternates: { canonical: "/iletisim" },
};
export default function ContactPage() {
  const profile = getLegalProfile();
  const whatsapp = profile.whatsappNumber.replace(/\D/g, "");
  const channels = [
    ...(whatsapp
      ? [
          {
            icon: MessageCircle,
            title: "WhatsApp",
            text: "Ziyaretiniz ve talebiniz hakkında ekibimizle görüşün.",
            href: `https://wa.me/${whatsapp}`,
            action: "WhatsApp’ı aç",
          },
        ]
      : []),
    ...(profile.contactPhone
      ? [
          {
            icon: Phone,
            title: "Telefon",
            text: profile.contactPhone,
            href: `tel:${profile.contactPhone.replace(/\s/g, "")}`,
            action: "Telefonla ara",
          },
        ]
      : []),
    ...(profile.contactEmail
      ? [
          {
            icon: Mail,
            title: "E-posta",
            text: profile.contactEmail,
            href: `mailto:${profile.contactEmail}`,
            action: "E-posta yaz",
          },
        ]
      : []),
    {
      icon: Search,
      title: "Talep takibi",
      text: "Talep kodunuz ve telefonunuzun son dört hanesiyle durumunuzu görün.",
      href: "/talep",
      action: "Talebimi takip et",
    },
  ];
  return (
    <InfoPage
      eyebrow="İLETİŞİM"
      title="Ziyaretiniz için buradayız."
      intro="Bireysel ziyaretiniz veya grubunuz için sorularınızı paylaşın. Mevcut talebiniz varsa takip kodunu hazır bulundurmanız görüşmeyi kolaylaştırır."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {channels.map(({ icon: Icon, title, text, href, action }) => (
          <section className="ravza-info-section flex flex-col" key={title}>
            <span className="ravza-icon">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-5">{title}</h2>
            <p className="mt-3 mb-5 break-words text-sm leading-7 text-muted-foreground">{text}</p>
            <a
              href={href}
              target={href.startsWith("https:") ? "_blank" : undefined}
              rel={href.startsWith("https:") ? "noopener noreferrer" : undefined}
              className="ravza-text-link mt-auto"
            >
              {action}
              <ArrowUpRight className="size-4" />
            </a>
          </section>
        ))}
      </div>
      <InfoSection title="Henüz talep oluşturmadınız mı?">
        <p>
          Ravza asistanına sorularınızı sorun; kişi sayısı ve ziyaret tarihlerini birlikte
          hazırlayın. Ardından iletişim bilgilerinizi ekleyerek talebinizi ekibimize iletin.
        </p>
        <Link href="/siparis" className="ravza-button mt-3">
          Ziyaret talebi oluştur
          <ArrowUpRight className="size-4" />
        </Link>
      </InfoSection>
      {profile.companyName || profile.address ? (
        <InfoSection title="İşletme bilgileri">
          {profile.companyName ? (
            <p className="font-medium text-foreground">{profile.companyName}</p>
          ) : null}
          {profile.address ? <p>{profile.address}</p> : null}
          {profile.kvkkEmail ? (
            <p>
              Verilerinizle ilgili başvurular:{" "}
              <a href={`mailto:${profile.kvkkEmail}`} className="underline underline-offset-4">
                {profile.kvkkEmail}
              </a>
            </p>
          ) : null}
        </InfoSection>
      ) : null}
    </InfoPage>
  );
}
