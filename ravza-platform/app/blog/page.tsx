import Link from '@/components/safe-link';
import { ArrowRight } from 'lucide-react';
import { InfoPage } from '@/components/info-page';

export const metadata = {
  title: 'Blog ve operasyon rehberleri · Ravza Randevu',
  description: 'Ravza randevusu, QR durumu ve toplu yolcu kaydı süreçleri hakkında kısa rehberler.',
  alternates: { canonical: '/blog' },
};
const posts = [{slug:'qr-durumu',title:'QR durumu nasıl okunmalı?',summary:'Hazır, bekleniyor ve kontrol gerekli durumlarının operasyonel farkı.'},{slug:'cift-onay',title:'Randevuda neden çift onay var?',summary:'Ravza randevu hakkı rezervasyonu ve idempotency ile yinelenen işlemleri önleme yaklaşımı.'},{slug:'excel-dogrulama',title:'Toplu yolcu dosyasında güvenli doğrulama',summary:'Satır bazlı hata raporu, MIME kontrolü ve formül enjeksiyonu riski.'}];
export default function BlogPage() { return <InfoPage eyebrow="Operasyon rehberi" title="Ekibin aynı dili konuşsun." intro="Randevu ve QR süreçlerini kesin olmayan vaatlerden arındıran kısa ürün rehberleri."><div className="grid gap-4">{posts.map((post) => <article key={post.slug} className="rounded-2xl border border-border bg-card p-6"><h2 className="font-serif text-2xl">{post.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{post.summary}</p><Link href={`/blog/${post.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">Rehberi oku <ArrowRight className="size-4" /></Link></article>)}</div></InfoPage>; }

