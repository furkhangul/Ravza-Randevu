'use client';
import Link from '@/components/safe-link';
import { BrandMark } from '@/components/brand-mark';
import { CredentialForm } from '@/components/credential-form';
import { SignOutButton } from '@/components/sign-out-button';
import { LoginTabs } from '@/components/login-tabs';

export function LoginExperience({ signedIn, staff = false, register = false, googleEnabled, returnTo, accountHref = '/hesabim' }: {
  signedIn: boolean; staff?: boolean; register?: boolean; googleEnabled: boolean; returnTo: string; accountHref?: string;
}) {
  return <main className="min-h-svh bg-[#071c14] px-4 py-8 text-[#f8f5f0] sm:px-7">
    <div className="mx-auto flex max-w-5xl items-center justify-between">
      <Link href="/" className="flex items-center gap-3"><BrandMark className="size-10" tone="onDark" /><span className="font-serif text-xl">Ravza Randevu</span></Link>
      <Link href="/iletisim" className="text-sm text-[#ead7a9]">Yardım ve iletişim</Link>
    </div>
    <section className="mx-auto grid max-w-5xl gap-10 py-14 lg:grid-cols-2 lg:items-center lg:py-24">
      <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d2b77b]">{staff ? 'YÖNETİCİ GİRİŞİ' : 'ZİYARETİNİZİ BİRLİKTE PLANLAYALIM'}</p>
        <h1 className="mt-5 font-serif text-5xl leading-tight">{staff ? 'Operasyonunuz tek bir yerde.' : 'Ziyaretinizin her adımı hesabınızda.'}</h1>
        <p className="mt-6 text-sm leading-7 text-white/65">{staff ? 'Yetkili hesabınızla talepleri, randevuları ve ziyaretçi bilgilerini yönetin.' : 'Hesabınızı oluşturun veya giriş yapın. Profilinizi kaydedin ve başvurularınızın durumunu takip edin.'}</p>
        <Link href="/siparis" className="mt-6 inline-block text-sm text-[#ead7a9] underline">Ziyaret talebi oluştur</Link>
      </div>
      <div className="rounded-[2rem] border border-white/15 bg-white/[.07] p-6 sm:p-8">
        <LoginTabs active={staff ? 'staff' : 'customer'} />
        <h2 className="mt-6 font-serif text-3xl">{staff ? 'Yönetici hesabı' : 'Müşteri hesabı'}</h2>
        {signedIn ? <div className="mt-6 space-y-4"><p>Oturumunuz açık.</p><Link href={accountHref} className="flex min-h-12 items-center justify-center rounded-xl bg-[#d2b77b] px-4 font-semibold text-[#071c14]">{staff ? 'Paneli aç' : 'Hesabımı aç'}</Link><SignOutButton fallbackHref={staff ? '/admin' : '/login'} label="Farklı hesapla giriş yap" className="text-sm underline" /></div> : <>
          {!staff && googleEnabled && <a href={`/api/auth/google/start?return_to=${encodeURIComponent(returnTo)}`} className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#071c14]">Google ile devam et</a>}
          <CredentialForm staff={staff} register={register} returnTo={returnTo} />
        </>}
        <div className="mt-7 border-t border-white/15 pt-5 text-sm"><Link href={staff ? '/login' : '/admin'} className="text-[#ead7a9] underline">{staff ? 'Müşteri girişine dön' : 'Yönetici / operasyon girişi'}</Link></div>
      </div>
    </section>
  </main>;
}
