import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';

export const metadata = {
  title: 'Ziyaret rehberi · Ravza Randevu',
  description:
    'Ravza-i Mutahhara ziyareti öncesi bilinmesi gerekenler: kadın ve erkek saatleri, QR kodunun kullanımı, hazırlık ve sık yapılan hatalar.',
};

const sections: Array<{
  id: string;
  title: string;
  lead: string;
  items: Array<[string, string]>;
}> = [
  {
    id: 'saatler',
    title: 'Kadın ve erkek saatleri neden ayrı?',
    lead: 'Ravza ziyaretinde en sık karışan konu budur. Randevu talebinde kadın ve erkek sayısını ayrı sormamızın sebebi de budur.',
    items: [
      [
        'Ayrı zaman dilimleri',
        'Ravza-i Mutahhara ziyareti kadınlar ve erkekler için farklı saat aralıklarında düzenlenir. Bir ailenin tamamı aynı saatte giremez; aynı gün içinde farklı saatlere düşebilir.',
      ],
      [
        'Randevu kişiye özeldir',
        'Her ziyaretçi için ayrı bir kayıt ve ayrı bir QR kodu oluşur. Bir kodu iki kişi kullanamaz.',
      ],
      [
        'Grupta dağılımı baştan verin',
        'Kafile taleplerinde kadın ve erkek sayısını doğru vermek, uygun saatlerin aranmasını hızlandırır.',
      ],
    ],
  },
  {
    id: 'qr',
    title: 'QR kodu nasıl kullanılır?',
    lead: 'QR kodu randevunuzun kanıtıdır; ziyaret günü yanınızda bulunmalıdır.',
    items: [
      [
        'Telefonunuza kaydedin',
        'Kodu ekran görüntüsü olarak da saklayın. Ziyaret alanında internet bağlantısı zayıf olabilir.',
      ],
      [
        'Kâğıt çıktı işe yarar',
        'Yaşlı ziyaretçiler için kodun kâğıda basılmış hâli daha kullanışlıdır. Grup taleplerinde tek PDF hâlinde iletiriz.',
      ],
      [
        'Kod başkasına devredilemez',
        'Kod kişiye özeldir ve isim eşleşmesi aranır. Başkasının kodunu kullanmaya çalışmak ziyaretin reddine yol açar.',
      ],
    ],
  },
  {
    id: 'hazirlik',
    title: 'Ziyaret günü hazırlık',
    lead: 'Randevu saatinden önce alanda olmak, en çok işe yarayan tek hazırlıktır.',
    items: [
      [
        'Erken gidin',
        'Yoğunluk nedeniyle giriş sıraları uzayabilir. Randevu saatinizden belirgin şekilde önce alanda olun.',
      ],
      [
        'Kimliğinizi yanınıza alın',
        'Pasaport veya ikamet belgesi istenebilir. QR kodu tek başına her zaman yeterli olmayabilir.',
      ],
      [
        'Ziyaret adabına dikkat',
        'Alan kalabalıktır ve görevlilerin yönlendirmesi esastır. Sakin davranmak hem sizin hem diğer ziyaretçilerin lehinedir.',
      ],
    ],
  },
  {
    id: 'hatalar',
    title: 'En sık yapılan hatalar',
    lead: 'Bunların çoğu talep aşamasında birkaç saniyede önlenebilir.',
    items: [
      [
        'Yanlış cinsiyet dağılımı',
        'Kadın ve erkek sayısını yanlış vermek, uygun olmayan saatlerin aranmasına ve gecikmeye yol açar.',
      ],
      [
        'Tek bir güne kilitlenmek',
        'Tarihlerinizin esnek olduğunu belirtirseniz uygun ilk gün bulunma ihtimali belirgin biçimde artar.',
      ],
      [
        'Yanlış telefon numarası',
        'QR kodunu ve bilgilendirmeleri WhatsApp üzerinden gönderiyoruz. Numaranın WhatsApp’ta açık olduğundan emin olun.',
      ],
      [
        'Son ana bırakmak',
        'Havuzdaki uygunluk sınırlıdır. Ziyaret tarihine yakın gelen talepler için seçenek azalır.',
      ],
    ],
  },
];

export default function GuidePage() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pattern-girih pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Ziyaret rehberi
          </p>
          <h1 className="mt-3 font-heading text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.05]">
            Ravza ziyareti öncesi bilinmesi gerekenler
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Aşağıdaki bilgiler ziyaretin işleyişine dairdir; dinî hüküm
            içermez. Uygulamaya dair kesin kurallar Harameyn yönetimi
            tarafından belirlenir ve zaman içinde değişebilir.
          </p>

          <nav aria-label="Bölümler" className="mt-8 flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm transition hover:bg-muted"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-12">
          {sections.map((section) => (
            <article key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-heading text-3xl">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {section.lead}
              </p>
              <div className="rule-mashrabiya my-6" />
              <dl className="space-y-5">
                {section.items.map(([title, text]) => (
                  <div key={title}>
                    <dt className="font-medium">{title}</dt>
                    <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                      {text}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}

          <div className="rounded-3xl border border-gold/40 bg-gold-soft/25 p-7">
            <h2 className="font-heading text-2xl">Hazır mısınız?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Altı kısa soruyu cevaplayın; uygunluğu birlikte bakalım.
            </p>
            <Link
              href="/siparis"
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Sipariş ver
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
