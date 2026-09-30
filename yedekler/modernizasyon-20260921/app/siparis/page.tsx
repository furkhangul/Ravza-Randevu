import { OrderAssistant } from '@/components/order-assistant';
import { PublicShell } from '@/components/public-shell';
import {
  isAppointmentPackageCode,
  type AppointmentPackageCode,
} from '@/lib/appointment-packages';
import { loadAssistantPackages } from '@/lib/assistant-data';

export const metadata = {
  title: 'Sipariş ver · Ravza Randevu',
  description:
    'Altı kısa soruyu cevaplayın, talebiniz kaydedilsin ve WhatsApp üzerinden görüşmeye devam edin.',
};

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.paket;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const initialPackageCode: AppointmentPackageCode | undefined =
    isAppointmentPackageCode(requested) ? requested : undefined;
  const packages = await loadAssistantPackages();

  return (
    <PublicShell>
      <div className="relative overflow-hidden bg-secondary/40 px-4 py-12 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pattern-girih pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Sipariş
            </p>
            <h1 className="mt-3 font-heading text-4xl leading-tight sm:text-5xl">
              Altı soru, sonra WhatsApp
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Tahsilat bu sitede yapılmaz. Talebinizi kaydederiz, fiyatı ve
              ödeme şeklini WhatsApp, telefon veya e-posta üzerinden
              konuşuruz.
            </p>
            <ol className="mt-8 space-y-4">
              {[
                [
                  'Talebiniz hemen kaydedilir',
                  'WhatsApp açılmasa bile kaydınız bize ulaşır ve size bir takip kodu verilir.',
                ],
                [
                  'Operasyon sizinle görüşür',
                  'Kişi sayısı, tarih ve saat tercihine göre uygunluk bakılır; fiyat netleştirilir.',
                ],
                [
                  'QR kodunuz iletilir',
                  'Randevu oluşunca kişiye özel QR kodu WhatsApp veya e-posta ile gönderilir.',
                ],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 text-sm text-[color:var(--gold)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:sticky lg:top-24">
            <OrderAssistant
              packages={packages}
              initialPackageCode={initialPackageCode}
              variant="page"
            />
          </div>
        </div>
      </div>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-2xl">Bilmeniz gerekenler</h2>
          <dl className="mt-6 divide-y divide-border">
            {[
              [
                'Randevu garantisi verilir mi?',
                'Hayır. Havuzda uygun yer bulunduğunda randevunuz oluşturulur. Ziyarete giriş kararı Harameyn yönetimine aittir.',
              ],
              [
                'Ödeme nasıl yapılır?',
                'Site üzerinden tahsilat yapılmaz. Ödeme şekli görüşme sırasında konuşulur; elden veya havale ile tamamlanır.',
              ],
              [
                'Kadın ve erkek aynı saatte ziyaret edebilir mi?',
                'Hayır. Ravza ziyaret saatleri kadın ve erkek için ayrıdır; bu yüzden asistanda dağılımı ayrıca soruyoruz.',
              ],
              [
                'Bilgilerim nereye gidiyor?',
                'Talebiniz sistemimize kaydedilir. WhatsApp’tan devam etmeyi seçerseniz mesaj içeriği WhatsApp üzerinden iletilir; bu aktarım için onayınız alınır.',
              ],
            ].map(([question, answer]) => (
              <div key={question} className="py-5">
                <dt className="text-base font-medium">{question}</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </PublicShell>
  );
}
