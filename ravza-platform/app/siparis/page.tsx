import Link from "@/components/safe-link";
import { ArrowUpRight } from "lucide-react";
import { VisitAssistant } from "@/components/visit-assistant";
import { PublicShell } from "@/components/public-shell";
import { isAppointmentPackageCode, type AppointmentPackageCode } from "@/lib/appointment-packages";
import { loadAssistantPackages } from "@/lib/assistant-data";

export const metadata = {
  title: "Ziyaret talebi · Ravza Randevu",
  description:
    "Ravza ziyaretinizi planlayın. Asistana sorun, ziyaret bilgilerinizi hazırlayın ve talebinizi ekibimize iletin.",
};
export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.paket) ? params.paket[0] : params.paket;
  const initialPackageCode: AppointmentPackageCode | undefined = isAppointmentPackageCode(requested)
    ? requested
    : undefined;
  const packages = await loadAssistantPackages();
  return (
    <PublicShell>
      <div className="ravza-container ravza-request-layout">
        <div className="ravza-request-intro">
          <p className="ravza-eyebrow">RAVZA ZİYARET TALEBİ</p>
          <h1>
            İlk adımınızda
            <br />
            yanınızdayız.
          </h1>
          <p>
            Aklınızdaki soruları asistana sorun veya doğrudan talep formuna geçin. Paylaştığınız
            ziyaret bilgileri formunuza taşınır; son karar ve onay her zaman sizde.
          </p>
          <ol>
            {[
              [
                "Ziyaretinizi birlikte hazırlayalım",
                "Kişi sayısı, kadın–erkek dağılımı ve Medine’de olacağınız tarihlerle başlayın.",
              ],
              [
                "Bilgileri kontrol edip gönderin",
                "İletişim bilgilerinizi formda ekleyin. Onayınızdan sonra talebiniz kaydedilir.",
              ],
              [
                "Talep kodunuzla takip edin",
                "Ekibimiz uygunluğu değerlendirsin. Gelişmeleri talep takip sayfasından görün.",
              ],
            ].map(([title, text], i) => (
              <li key={title}>
                <span>0{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="ravza-request-note">
            Talep oluşturmak kesinleşmiş randevu değildir. Hizmet kapsamı ve ücret, ekibimizle
            görüşmenizde netleşir.
            <br />
            <Link href="/talep" className="ravza-text-link mt-3">
              Mevcut talebimi takip et
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
        <VisitAssistant
          packages={packages}
          initialPackageCode={initialPackageCode}
          variant="page"
        />
      </div>
    </PublicShell>
  );
}

