'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { BrandMark } from '@/components/brand-mark';
import { OrderAssistantLauncher } from '@/components/order-assistant-launcher';
import type { AssistantPackage } from '@/components/order-assistant';
import {
  PublicPreferenceControls,
  PublicPreferencesProvider,
  usePublicPreferences,
} from '@/components/public-preferences';

export type AgencyLicence =
  | { display: false }
  | { display: true; title: string; licenceNumber: string };

const copy = {
  tr: {
    packages: 'Paketler',
    how: 'Nasıl çalışır?',
    faq: 'SSS',
    guide: 'Ziyaret rehberi',
    contact: 'İletişim',
    login: 'Giriş yap',
    order: 'Sipariş ver',
    account: 'Seyahatim',
    footer:
      'Ravza-i Mutahhara ziyareti için randevu, QR ve operasyon takibi. Tahsilat site üzerinden yapılmaz.',
    copyright: '© 2026',
    operatedBy: 'İşleten',
    mainNavLabel: 'Kurumsal menü',
    mobileNavLabel: 'Mobil menü',
    legalNavLabel: 'Yasal bağlantılar',
    licenceNumber: 'İşletme belge no',
    trackTitle: 'Talebinizi takip edin',
    trackHint: 'Elinizdeki TALEP- kodunu girin.',
    trackAction: 'Sorgula',
    legal: {
      kvkk: 'KVKK merkezi',
      notice: 'Aydınlatma',
      cookies: 'Çerezler',
      retention: 'Saklama ve imha',
      terms: 'Hizmet koşulları',
      contact: 'İletişim',
    },
  },
  en: {
    packages: 'Packages',
    how: 'How it works',
    faq: 'FAQ',
    guide: 'Visit guide',
    contact: 'Contact',
    login: 'Sign in',
    order: 'Order',
    account: 'My trip',
    footer:
      'Appointment, QR and operations tracking for visiting Rawdah. No payment is collected on this site.',
    copyright: '© 2026',
    operatedBy: 'Operated by',
    mainNavLabel: 'Main menu',
    mobileNavLabel: 'Mobile menu',
    legalNavLabel: 'Legal links',
    licenceNumber: 'Licence no',
    trackTitle: 'Track your request',
    trackHint: 'Enter the TALEP- code you received.',
    trackAction: 'Check',
    legal: {
      kvkk: 'Data protection centre',
      notice: 'Privacy notice',
      cookies: 'Cookies',
      retention: 'Retention and disposal',
      terms: 'Terms of service',
      contact: 'Contact',
    },
  },
  ar: {
    packages: 'الباقات',
    how: 'كيف يعمل؟',
    faq: 'الأسئلة الشائعة',
    guide: 'دليل الزيارة',
    contact: 'اتصل بنا',
    login: 'تسجيل الدخول',
    order: 'اطلب الآن',
    account: 'رحلتي',
    footer:
      'حجز المواعيد ورمز QR ومتابعة العمليات لزيارة الروضة. لا يتم تحصيل أي مبالغ عبر الموقع.',
    copyright: '© 2026',
    operatedBy: 'مشغّل الخدمة',
    mainNavLabel: 'القائمة الرئيسية',
    mobileNavLabel: 'قائمة الجوال',
    legalNavLabel: 'الروابط القانونية',
    licenceNumber: 'رقم الترخيص',
    trackTitle: 'تتبع طلبك',
    trackHint: 'أدخل رمز TALEP- الذي استلمته.',
    trackAction: 'استعلام',
    legal: {
      kvkk: 'مركز حماية البيانات',
      notice: 'إشعار الخصوصية',
      cookies: 'ملفات تعريف الارتباط',
      retention: 'الحفظ والإتلاف',
      terms: 'شروط الخدمة',
      contact: 'اتصل بنا',
    },
  },
};

export function PublicShellClient({
  children,
  contact,
  licence,
  companyName,
  brandName,
  packages,
}: {
  children: ReactNode;
  contact: { phone: string; whatsapp: string };
  licence: AgencyLicence;
  companyName: string;
  brandName: string;
  packages: AssistantPackage[];
}) {
  return (
    <PublicPreferencesProvider>
      <PublicShellContent
        contact={contact}
        licence={licence}
        companyName={companyName}
        brandName={brandName}
        packages={packages}
      >
        {children}
      </PublicShellContent>
    </PublicPreferencesProvider>
  );
}

function PublicShellContent({
  children,
  contact,
  licence,
  companyName,
  brandName,
  packages,
}: {
  children: ReactNode;
  contact: { phone: string; whatsapp: string };
  licence: AgencyLicence;
  companyName: string;
  brandName: string;
  packages: AssistantPackage[];
}) {
  const { locale } = usePublicPreferences();
  const labels = copy[locale];
  const navItems: Array<[string, string]> = [
    ['/paketler', labels.packages],
    ['/#nasil-calisir', labels.how],
    ['/rehber', labels.guide],
    ['/sss', labels.faq],
    ['/iletisim', labels.contact],
  ];

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-16 max-w-[90rem] items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary">
              <BrandMark className="size-7" tone="onDark" />
            </span>
            <span className="hidden font-heading text-xl sm:inline">
              {brandName}
            </span>
          </Link>
          <nav
            className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex"
            aria-label={labels.mainNavLabel}
          >
            {navItems.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <PublicPreferenceControls idPrefix="desktop" />
            </div>
            <Link
              href="/login"
              className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted lg:inline-flex"
            >
              {labels.login}
            </Link>
            <Link
              href="/siparis"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              {labels.order}
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-[90rem] items-center gap-3 border-t border-border/50 py-2 lg:hidden">
          <div className="shrink-0">
            <PublicPreferenceControls idPrefix="mobile" />
          </div>
          <nav
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto ps-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={labels.mobileNavLabel}
          >
            {[...navItems, ['/hesabim', labels.account] as [string, string]].map(
              ([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  {label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>

      {children}

      <footer className="relative overflow-hidden bg-[#071c14] px-6 py-14 text-white lg:px-8">
        <div
          aria-hidden="true"
          className="pattern-girih pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto max-w-[90rem]">
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white/10">
                  <BrandMark className="size-7" tone="onDark" />
                </span>
                <span className="font-heading text-xl">{brandName}</span>
              </div>
              <p className="mt-4 max-w-md text-xs leading-5 text-white/45">
                {labels.footer}
              </p>
              {licence.display ? (
                <span className="mt-5 block text-xs text-white/55">
                  {licence.title} · {labels.licenceNumber}:{' '}
                  {licence.licenceNumber}
                </span>
              ) : null}
              {companyName ? (
                <span className="mt-4 block text-xs text-white/45">
                  {labels.operatedBy}: {companyName}
                </span>
              ) : null}
              <span className="mt-2 block text-xs text-white/35">
                {labels.copyright} {brandName}
              </span>
            </div>

            <div className="max-w-xs">
              <p className="text-sm font-medium text-white/85">
                {labels.trackTitle}
              </p>
              <p className="mt-1 text-xs text-white/45">{labels.trackHint}</p>
              <form action="/talep" className="mt-3 flex gap-2">
                <input
                  name="kod"
                  aria-label={labels.trackTitle}
                  placeholder="TALEP-…"
                  className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus-visible:border-white/40 focus-visible:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-11 shrink-0 rounded-xl bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20"
                >
                  {labels.trackAction}
                </button>
              </form>
            </div>
          </div>

          <div className="rule-mashrabiya my-8" />

          <nav
            className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-white/50"
            aria-label={labels.legalNavLabel}
          >
            {[
              ['/kvkk', labels.legal.kvkk],
              ['/aydinlatma', labels.legal.notice],
              ['/cerez-politikasi', labels.legal.cookies],
              ['/saklama-imha', labels.legal.retention],
              ['/sozlesme', labels.legal.terms],
              ['/iletisim', labels.legal.contact],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>

      <OrderAssistantLauncher packages={packages} phone={contact.phone} />
    </main>
  );
}
