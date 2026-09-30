import Link from "@/components/safe-link";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
export const metadata = {
  title: "Umre ve ziyaret rehberi · Ravza Randevu",
  description:
    "Umre adımları, Mekke ve Medine ziyaret yerleri, Nusuk randevusu ve yolculuk hazırlıkları hakkında temel bilgiler.",
};
const sections = [
  {
    id: "ravza",
    title: "Ravza’yı tanıyalım",
    lead: "Ravza-i Mutahhara, Mescid-i Nebevî’de Peygamber Efendimizin (s.a.v.) evi ile minberi arasında bulunan mübarek alandır.",
    items: [
      "Ravza’da namaz için randevu süreci ile kabr-i şerife selam ziyareti güzergâhı birbirinden farklıdır. Ziyaretinizi planlarken bu ayrımı dikkate alın.",
      "Bu platform bireysel ziyaretçiler, aileler ve gruplar için Ravza ziyaret talebinin hazırlanmasına ve takibine yardımcı olur.",
    ],
  },
  {
    id: "randevu",
    title: "Randevu ve Nusuk süreci",
    lead: "Ravza ziyaret izni için resmî kanal Nusuk’tur. Sitemizde hazırladığınız talep, resmî ziyaret izninin yerine geçmez.",
    items: [
      "Talepte kişi sayısını ve Medine’de olacağınız tarih aralığını paylaşın. Ekibimiz uygunluğu değerlendirmek için bu bilgileri kullanır.",
      "Kadın ve erkek ziyaretçilerin randevuları ayrı değerlendirilir. Grup talebi, herkesin aynı saatte gireceği anlamına gelmez.",
      "Ziyaret saatleri ve kontenjanlar değişebilir. Kesin bilgiyi resmî randevu kaydı ve güncel Nusuk talimatları üzerinden kontrol edin.",
    ],
  },
  {
    id: "qr",
    title: "Randevu ve QR bilginiz",
    lead: "Randevu onaylandığında size iletilen kaydı dikkatle kontrol edin.",
    items: [
      "Ziyaretçinin adı, tarih ve saat bilgilerinin doğru olduğundan emin olun. Bir uyuşmazlık varsa ziyaret öncesinde ekibimizle görüşün.",
      "QR ve izin bilgisini girişte görevlilerin istediği biçimde hazır bulundurun. Ekran görüntüsü veya çıktı kabulünü varsaymayın; resmî uygulamadaki güncel yönlendirmeyi izleyin.",
      "QR bilgisi kişiye özeldir. Başkasının randevu kaydını kullanmayın veya kendi kodunuzu başkalarıyla paylaşmayın.",
    ],
  },
  {
    id: "hazirlik",
    title: "Ziyaret günü hazırlıkları",
    lead: "Güncel randevu kaydını kontrol etmek ve görevlilerin yönlendirmelerine uymak ziyaretinizi kolaylaştırır.",
    items: [
      "Telefonunuzun şarjını ve randevu bilgilerine erişiminizi kontrol edin. Resmî talimatlarda belirtilen kimlik belgelerini yanınızda bulundurun.",
      "Giriş yeri ve hazır bulunmanız gereken zamanı güncel randevunuzdan öğrenin. Herkese uyan sabit bir giriş saati varsaymayın.",
      "Yaşlı ziyaretçi, çocuk veya erişilebilirlik ihtiyacı varsa talebinizin not alanında belirtin; geçerli koşulları ekibimizle teyit edin.",
      "Mescidin sükûnetine, diğer ziyaretçilere ve görevlilerin yönlendirmelerine özen gösterin.",
    ],
  },
  {
    id: "umre",
    title: "Umre ibadetinin temel adımları",
    lead: "Umrenin ana akışı ihrama girme, tavaf, sa’y ve saçın kısaltılması ya da tıraş edilmesidir. Mikat, niyet ve uygulama ayrıntıları için yetkili dinî rehberliği izleyin.",
    items: [
      "Yola çıkmadan önce güncel Nusuk talimatlarını, izin koşullarını ve konaklama planınızı kontrol edin.",
      "Tavaf ve sa’y sırasında görevlilerin yönlendirmelerine uyun; kalabalık ve sıcak koşullarını dikkate alarak temponuzu ayarlayın.",
      "Fıkhî ayrıntılar kişisel duruma göre değişebileceğinden güvendiğiniz din görevlisine danışın.",
    ],
  },
  {
    id: "ziyaret-yerleri",
    title: "Mekke ve Medine’de ziyaret edilebilecek yerler",
    lead: "Ziyaret programı ve erişim koşulları değişebilir. Yolculuk öncesinde yerel duyuruları ve tur rehberinizin planını kontrol edin.",
    items: [
      "Mekke’de Mescid-i Haram ve Kâbe, umre yolculuğunun merkezindedir. Cebel-i Nur ve Hira Mağarası çevresindeki yürüyüşler için hava ve güvenlik koşullarını önceden değerlendirin.",
      "Medine’de Mescid-i Nebevî’nin yanı sıra Kuba Mescidi, Uhud ve Mescid-i Kıbleteyn ziyaret programlarına eklenebilir.",
      "Tarihî mekân ziyaretlerinde ibadet ve dua için zorunlu bir uygulama olduğu varsayılmamalı; yerel görevlilerin kurallarına uyulmalıdır.",
    ],
  },
];
export default function GuidePage() {
  return (
    <PublicShell>
      <section className="ravza-container ravza-info-page">
        <header className="ravza-info-head">
          <p className="ravza-eyebrow">UMRE VE ZİYARET REHBERİ</p>
          <h1>
            Bilerek hazırlanın,
            <br />
            huzurla yola çıkın.
          </h1>
          <p>
            Ravza ziyaretinizi planlarken ihtiyaç duyacağınız temel bilgiler. Güncel giriş ve izin
            koşullarında resmî kurumların yönlendirmeleri esas alınır.
          </p>
        </header>
        <div className="ravza-guide-layout">
          <nav aria-label="Rehber bölümleri" className="ravza-guide-nav">
            {sections.map((section, i) => (
              <a key={section.id} href={`#${section.id}`}>
                0{i + 1} · {section.title}
              </a>
            ))}
          </nav>
          <div className="ravza-guide-content">
            {sections.map((section) => (
              <article id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                <p>{section.lead}</p>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
            <div className="ravza-guide-source">
              <span>Resmî bilgi kaynakları:</span>
              <a href="https://umrah.nusuk.sa/Journey" target="_blank" rel="noopener noreferrer">Nusuk · Umre yolculuğu</a>
              <a href="https://haj.gov.sa/en/Awareness-Center/Awareness-Guides" target="_blank" rel="noopener noreferrer">Hac ve Umre Bakanlığı · Rehberler</a>
              <a href="https://www.nusuk.sa/rawdah/" target="_blank" rel="noopener noreferrer">
                Nusuk · Ravza
              </a>
              <a
                href="https://alharamain.gov.sa/public/?page=rawdah-en"
                target="_blank"
                rel="noopener noreferrer"
              >
                Harameyn · Ravza bilgisi
              </a>
            </div>
            <Link href="/siparis" className="ravza-button mt-8">
              Ziyaretimi planla
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}


