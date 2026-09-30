import type { ReactNode } from 'react';
import Link from '@/components/safe-link';
import { BrandMark } from '@/components/brand-mark';
import { LoginTabs } from '@/components/login-tabs';

/** Acente giriş ve başvuru sayfalarının ortak çerçevesi (müşteri/yönetici girişiyle aynı görünüm). */
export function AgencyAuthShell({ title, lead, cardTitle, tabs = true, children }: {
  title: string; lead: string; cardTitle: string; tabs?: boolean; children: ReactNode;
}) {
  return (
    <main className="min-h-svh bg-[#071c14] px-4 py-8 text-[#f8f5f0] sm:px-7">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3"><BrandMark className="size-10" tone="onDark" /><span className="font-serif text-xl">Ravza Randevu</span></Link>
        <Link href="/iletisim" className="text-sm text-[#ead7a9]">Yardım ve iletişim</Link>
      </div>
      <section className="mx-auto grid max-w-5xl gap-10 py-14 lg:grid-cols-2 lg:items-start lg:py-20">
        <div className="lg:sticky lg:top-10">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d2b77b]">ACENTE / ŞİRKET</p>
          <h1 className="mt-5 font-serif text-5xl leading-tight">{title}</h1>
          <p className="mt-6 text-sm leading-7 text-white/65">{lead}</p>
          <ul className="mt-6 space-y-2 text-sm text-white/75">
            <li>• Toplu Ravza randevu hakkı (kontör) talep edin</li>
            <li>• Kontörünüzü istediğiniz gün ve saatte kullanın</li>
            <li>• Resmî QR bağlantılarını tek panelden yönetin</li>
            <li>• Tüm kontör hareketlerinizi şeffafça görün</li>
          </ul>
        </div>
        <div className="rounded-[2rem] border border-white/15 bg-white/[.07] p-6 sm:p-8">
          {tabs ? <LoginTabs active="agency" /> : null}
          <h2 className="mt-6 font-serif text-3xl">{cardTitle}</h2>
          {children}
        </div>
      </section>
    </main>
  );
}
