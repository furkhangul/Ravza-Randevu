import { redirect } from 'next/navigation';
import Link from '@/components/safe-link';
import { AgencyPortal } from '@/components/agency-portal';
import { BrandMark } from '@/components/brand-mark';
import { SignOutButton } from '@/components/sign-out-button';
import { getAgencyContext } from '@/lib/agency-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acente paneli · Ravza Randevu', robots: { index: false } };

export default async function AgencyHomePage() {
  const context = await getAgencyContext().catch(() => null);
  if (!context) redirect('/acente/giris');
  return (
    <main className="min-h-svh bg-[#f4f5f0]">
      <header className="border-b border-black/5 bg-[#071c14] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark className="size-9" tone="onDark" />
            <span>
              <span className="block font-serif text-lg leading-tight">Ravza Randevu</span>
              <span className="block text-[11px] uppercase tracking-[.18em] text-[#d2b77b]">Acente paneli</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-end sm:block">
              <span className="block font-semibold">{context.agency.companyName}</span>
              <span className="block text-xs text-white/60">{context.member.fullName}</span>
            </span>
            <SignOutButton fallbackHref="/acente/giris" label="Çıkış" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="font-serif text-3xl">Hoş geldiniz, {context.member.fullName.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kontörünüzle Ravza randevusu alın, QR bağlantılarını yolcularınıza iletin.</p>
        <div className="mt-6">
          <AgencyPortal />
        </div>
      </div>
    </main>
  );
}
