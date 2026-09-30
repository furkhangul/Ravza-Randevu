import Link from '@/components/safe-link';

import { CustomerOrderDashboard } from '@/components/customer-order-dashboard';
import { CustomerProfileForm } from '@/components/customer-profile-form';
import { PublicShell } from '@/components/public-shell';
import { getPortalUser } from '@/lib/current-user';
import { isGoogleLoginEnabled } from '@/lib/google-oauth';
import { SignOutButton } from '@/components/sign-out-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hesabım · Ravza Randevu',
  description:
    'Profil bilgileriniz, rezervasyonlarınız ve başvuru durumlarınız tek sayfada.',
};

export default async function AccountPage() {
  const user = await getPortalUser();

  if (!user) {
    return (
      <PublicShell>
        <section className="px-4 py-16 sm:px-7">
          <div className="mx-auto max-w-lg rounded-3xl border border-border bg-white p-7 text-center">
            <h1 className="font-serif text-2xl tracking-[-.02em]">
              Hesabınıza girin
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Profil bilgileriniz ve başvurularınız yalnız giriş yaptığınızda
              görünür.
            </p>
            {isGoogleLoginEnabled() ? (
              <a
                href="/api/auth/google/start?return_to=%2Fhesabim"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-[#123d2b]"
              >
                Google ile giriş yap
              </a>
            ) : null}
            <Link
              href="/login"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border px-6 text-sm font-medium transition hover:bg-muted"
            >
              Diğer giriş seçenekleri
            </Link>
          </div>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="px-4 py-8 sm:px-7 lg:py-12">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7">
            <SignOutButton fallbackHref="/login" className="float-right rounded-xl border px-4 py-2 text-sm" />
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#80652f]">
              Hesabım
            </p>
            <h1 className="mt-1 font-serif text-3xl tracking-[-.025em]">
              {user.displayName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Bu sayfada iki şey var: seyahat için gereken kişisel bilgileriniz
              ve açtığınız rezervasyon başvurularının güncel durumu. Profili bir
              kez doldurduğunuzda yeni rezervasyon formları kendiliğinden
              dolar.
            </p>
          </header>

          <div className="mb-10">
            <CustomerProfileForm email={user.email} />
          </div>

          <section aria-labelledby="account-applications">
            <h2
              id="account-applications"
              className="mb-4 font-serif text-2xl tracking-[-.02em]"
            >
              Başvurularım
            </h2>
            <CustomerOrderDashboard />
          </section>
        </div>
      </section>
    </PublicShell>
  );
}
