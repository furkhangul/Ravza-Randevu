import { notFound } from 'next/navigation';
import { InfoPage, InfoSection } from '@/components/info-page';
const articles: Record<string, { title: string; intro: string; sections: Array<[string,string]> }> = {
  'qr-durumu': { title: 'QR durumu nasıl okunmalı?', intro: 'Randevu başarısı ile QR hazırlığı aynı durum değildir.', sections: [['Hazır','Doğrulanmış sağlayıcı yanıtı alınmıştır; yetkili paylaşım ve PDF işlemleri açılabilir.'],['Sağlayıcı bekleniyor','Sipariş sonucu kesin olabilir ancak QR henüz hazır değildir. Kesin süre verilmez.'],['Kontrol gerekiyor','Sonuç belirsizdir; yeniden satın alma yerine mutabakat kuyruğu çalışır.']] },
  'cift-onay': { title: 'Randevuda neden çift onay var?', intro: 'Kullanıcının tarih, saat, grup ve randevu hakkı etkisini işlemden önce iki kez görmesi hata riskini azaltır.', sections: [['Birinci kontrol','Seçim özeti ve kapasite doğrulanır.'],['İkinci kontrol','Ravza randevu hakkı etkisi ve idempotency anahtarı hazırlanır.'],['Belirsiz sonuç','Aynı işlem yeniden gönderilmez; mevcut sipariş sorgulanır.']] },
  'excel-dogrulama': { title: 'Toplu yolcu dosyasında güvenli doğrulama', intro: 'Dosyadaki her satır açık bir sonuç üretmelidir.', sections: [['Dosya kapısı','Tür, boyut, arşiv ve formül riskleri kontrol edilir.'],['Satır raporu','Hatalı alan, satır numarası ve neden kullanıcıya gösterilir.'],['Onay','Yalnız doğrulanan satırlar kullanıcı onayından sonra kaydedilir.']] },
};
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return {};
  return {
    title: `${article.title} · Ravza Randevu`,
    description: article.intro,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { type: 'article', title: article.title, description: article.intro, url: `/blog/${slug}` },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const article = articles[slug]; if (!article) notFound(); return <InfoPage eyebrow="Operasyon rehberi" title={article.title} intro={article.intro}>{article.sections.map(([title,text]) => <InfoSection key={title} title={title}><p>{text}</p></InfoSection>)}</InfoPage>; }

