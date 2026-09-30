"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "@/components/safe-link";

import { BrandMark } from "@/components/brand-mark";
import { OrderAssistantLauncher } from "@/components/order-assistant-launcher";
import { LaunchAnnouncement, SiteMusicControl } from "@/components/site-enhancements";
import type { AssistantPackage } from "@/components/order-assistant";
import {
  PublicPreferenceControls,
  PublicPreferencesProvider,
  usePublicPreferences,
} from "@/components/public-preferences";

export type AgencyLicence =
  | { display: false }
  | { display: true; title: string; licenceNumber: string };

const copy = {
  tr: {
    packages: "Paketler",
    how: "Nasıl çalışır?",
    faq: "SSS",
    guide: "Umre ve ziyaret rehberi",
    contact: "İletişim",
    login: "Giriş yap",
    order: "Ziyaret talebi",
    account: "Hesabım",
    footer:
      "Ravza-i Mutahhara ziyareti için randevu, QR ve operasyon takibi. Tahsilat site üzerinden yapılmaz.",
    copyright: "© 2026",
    mainNavLabel: "Kurumsal menü",
    mobileNavLabel: "Mobil menü",
    legalNavLabel: "Yasal bağlantılar",
    licenceNumber: "İşletme belge no",
    trackTitle: "Talebinizi takip edin",
    trackHint: "Elinizdeki TALEP- kodunu girin.",
    trackAction: "Sorgula",
    legal: {
      kvkk: "KVKK merkezi",
      notice: "Aydınlatma",
      cookies: "Çerezler",
      disclaimer: "Sorumluluk reddi",
      retention: "Saklama ve imha",
      terms: "Hizmet koşulları",
      contact: "İletişim",
    },
  },
  en: {
    packages: "Packages",
    how: "How it works",
    faq: "FAQ",
    guide: "Umrah and visit guide",
    contact: "Contact",
    login: "Sign in",
    order: "Plan a visit",
    account: "My trip",
    footer:
      "Appointment, QR and operations tracking for visiting Rawdah. No payment is collected on this site.",
    copyright: "© 2026",
    mainNavLabel: "Main menu",
    mobileNavLabel: "Mobile menu",
    legalNavLabel: "Legal links",
    licenceNumber: "Licence no",
    trackTitle: "Track your request",
    trackHint: "Enter the TALEP- code you received.",
    trackAction: "Check",
    legal: {
      kvkk: "Data protection centre",
      notice: "Privacy notice",
      cookies: "Cookies",
      disclaimer: "Disclaimer",
      retention: "Retention and disposal",
      terms: "Terms of service",
      contact: "Contact",
    },
  },
  ar: {
    packages: "الباقات",
    how: "كيف يعمل؟",
    faq: "الأسئلة الشائعة",
    guide: "دليل العمرة والزيارة",
    contact: "اتصل بنا",
    login: "تسجيل الدخول",
    order: "طلب الزيارة",
    account: "رحلتي",
    footer: "حجز المواعيد ورمز QR ومتابعة العمليات لزيارة الروضة. لا يتم تحصيل أي مبالغ عبر الموقع.",
    copyright: "© 2026",
    mainNavLabel: "القائمة الرئيسية",
    mobileNavLabel: "قائمة الجوال",
    legalNavLabel: "الروابط القانونية",
    licenceNumber: "رقم الترخيص",
    trackTitle: "تتبع طلبك",
    trackHint: "أدخل رمز TALEP- الذي استلمته.",
    trackAction: "استعلام",
    legal: {
      kvkk: "مركز حماية البيانات",
      notice: "إشعار الخصوصية",
      cookies: "ملفات تعريف الارتباط",
      disclaimer: "إخلاء المسؤولية",
      retention: "الحفظ والإتلاف",
      terms: "شروط الخدمة",
      contact: "اتصل بنا",
    },
  },
};

export function PublicShellClient({
  children,
  contact,
  licence,
  brandName,
  packages,
}: {
  children: ReactNode;
  contact: { phone: string; whatsapp: string };
  licence: AgencyLicence;
  brandName: string;
  packages: AssistantPackage[];
}) {
  return (
    <PublicPreferencesProvider>
      <PublicShellContent
        contact={contact}
        licence={licence}
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
  brandName,
  packages,
}: {
  children: ReactNode;
  contact: { phone: string; whatsapp: string };
  licence: AgencyLicence;
  brandName: string;
  packages: AssistantPackage[];
}) {
  const { locale } = usePublicPreferences();
  const labels = copy[locale];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const subtitle = {
    tr: "ZİYARETİNİZ İÇİN YANINIZDAYIZ",
    en: "HERE FOR YOUR VISIT",
    ar: "هنا من أجل زيارتك",
  }[locale];
  const topNote = {
    tr: "Ravza ziyaretinize özenle hazırlanın.",
    en: "Prepare for a meaningful Rawdah visit.",
    ar: "استعد لزيارة الروضة بعناية.",
  }[locale];
  const navItems: Array<[string, string]> = [

    ["/#nasil-calisir", labels.how],
    ["/rehber", labels.guide],
    ["/sss", labels.faq],
    ["/iletisim", labels.contact],
  ];

  return (
    <div className="ravza-site min-h-svh">
      <LaunchAnnouncement />
      <a href="#main-content" className="ravza-skip-link">
        {locale === "tr"
          ? "İçeriğe geç"
          : locale === "en"
            ? "Skip to content"
            : "انتقل إلى المحتوى"}
      </a>
      <div className="ravza-topbar">
        <div className="ravza-container">
          <span>{topNote}</span>
        </div>
      </div>
      <header className="ravza-header">
        <div className="ravza-container ravza-header-inner">
          <Link href="/" className="ravza-brand" aria-label={brandName}>
            <span className="ravza-brand-icon">
              <BrandMark className="size-8" />
            </span>
            <span>
              <span className="ravza-brand-name">{brandName}</span>
              <small>{subtitle}</small>
            </span>
          </Link>
          <nav className="ravza-nav" aria-label={labels.mainNavLabel}>
            {navItems.map(([href, label]) => (
              <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="ravza-header-actions">
            <div className="ravza-header-preferences">
              <PublicPreferenceControls idPrefix="desktop" />
            </div>
            <SiteMusicControl />
            <Link href="/login" className="ravza-button ravza-button-outline ravza-header-login">
              {labels.login}
            </Link>
            <Link href="/talep" className="ravza-button ravza-button-outline ravza-header-track">
              {labels.trackTitle}
            </Link>
            <Link href="/siparis" className="ravza-button">
              {labels.order}
              <ArrowUpRight className="size-3.5" />
            </Link>
            <button
              type="button"
              className="ravza-menu-button"
              aria-expanded={menuOpen}
              aria-controls="ravza-mobile-menu"
              aria-label={labels.mobileNavLabel}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        <div id="ravza-mobile-menu" hidden={!menuOpen} className="ravza-mobile-nav ravza-container">
          <nav aria-label={labels.mobileNavLabel}>
            {[
              ...navItems,
              ["/siparis", labels.order],
              ["/talep", labels.trackTitle],
              ["/login", labels.login],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={pathname === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <PublicPreferenceControls idPrefix="mobile" />
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="ravza-footer">
        <div className="ravza-container">
          <div className="ravza-footer-grid">
            <div>
              <Link href="/" className="ravza-brand">
                <BrandMark className="size-10" />
                <span>
                  <span className="ravza-brand-name">{brandName}</span>
                  <small>{subtitle}</small>
                </span>
              </Link>
              <p className="ravza-footer-about">{labels.footer}</p>
              {licence.display ? (
                <p className="text-xs text-white/70">
                  {licence.title} · {labels.licenceNumber}: {licence.licenceNumber}
                </p>
              ) : null}
            </div>
            <div>
              <h2>
                {locale === "tr"
                  ? "Ziyaretinizi planlayın"
                  : locale === "en"
                    ? "Plan your visit"
                    : "خطط لزيارتك"}
              </h2>
              <nav className="ravza-footer-links" aria-label={labels.mainNavLabel}>
                {navItems.map(([href, label]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
                <Link href="/login">{labels.login}</Link>
              </nav>
            </div>
            <div>
              <h2>{labels.trackTitle}</h2>
              <p className="text-xs leading-6 text-[#b3c5b8]">{labels.trackHint}</p>
              <form action="/talep">
                <input
                  name="kod"
                  aria-label={labels.trackTitle}
                  placeholder="TALEP-…"
                  maxLength={30}
                  required
                />
                <button type="submit">{labels.trackAction}</button>
              </form>
            </div>
          </div>
          <nav className="ravza-footer-legal" aria-label={labels.legalNavLabel}>
            {[
              ["/kvkk", labels.legal.kvkk],
              ["/aydinlatma", labels.legal.notice],
              ["/cerez-politikasi", labels.legal.cookies],
              ["/sorumluluk-reddi", labels.legal.disclaimer],
              ["/saklama-imha", labels.legal.retention],
              ["/sozlesme", labels.legal.terms],
              ["/iletisim", labels.legal.contact],
            ].map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <p className="ravza-footer-copyright">
            {labels.copyright} {brandName}
          </p>
        </div>
      </footer>
      <OrderAssistantLauncher packages={packages} phone={contact.phone} />
    </div>
  );
}


