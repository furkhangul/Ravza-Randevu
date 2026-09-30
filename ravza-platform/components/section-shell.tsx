import type { ReactNode } from 'react';
import Link from '@/components/safe-link';
import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardClock,
  LayoutDashboard,
  MessageSquareQuote,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  WalletCards,
} from 'lucide-react';

import { BrandMark } from '@/components/brand-mark';
import { CreditPill } from '@/components/credit-pill';
import { SignOutButton } from '@/components/sign-out-button';

import { requireAppUser } from '@/lib/app-auth';

/**
 * Panel yedi ana ekrana indirildi. Daha önce on üç ayrı adreste duran
 * işlevler burada birleşti; her ekranda tek bir birincil iş var.
 */
const navigation = [
  {
    label: 'Operasyon',
    items: [
      { href: '/panel', label: 'Arayüz', icon: LayoutDashboard },
      { href: '/panel/talepler', label: 'Talepler', icon: ClipboardClock },
      { href: '/panel/randevular', label: 'Randevular', icon: CalendarDays },
      { href: '/panel/yolcular', label: 'Yolcular', icon: UsersRound },
      { href: '/panel/acenteler', label: 'Acenteler', icon: Building2 },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { href: '/panel/kontor', label: 'Ravza randevu hakkı', icon: BookOpenCheck },
      { href: '/panel/paketler', label: 'Paketler', icon: WalletCards },
      {
        href: '/panel/geri-bildirim',
        label: 'Geri bildirim',
        icon: MessageSquareQuote,
      },
      { href: '/panel/ayarlar', label: 'Ayarlar', icon: UserRoundCog },
    ],
  },
  {
    label: 'Sistem',
    adminOnly: true,
    items: [
      {
        href: '/panel/yonetim',
        label: 'Yönetim merkezi',
        icon: ShieldCheck,
        superOnly: true,
      },
    ],
  },
];

export async function SectionShell({
  title,
  eyebrow,
  activePath,
  children,
}: {
  title: string;
  eyebrow: string;
  activePath: string;
  children: ReactNode;
}) {
  const user = await requireAppUser(activePath);
  const visibleGroups = navigation
    .filter((group) => !group.adminOnly || user.role !== 'STAFF')
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !('superOnly' in item) ||
          !item.superOnly ||
          user.role === 'SUPER_ADMIN',
      ),
    }));
  const mobileItems = visibleGroups.flatMap((group) => group.items);

  return (
    <main className="min-h-svh bg-[#eef1ed] text-foreground">
      <div className="mx-auto grid min-h-svh max-w-[1800px] lg:grid-cols-[18rem_1fr]">
        <aside className="relative hidden overflow-hidden bg-[#071c14] px-5 py-6 text-white lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute -top-24 -left-20 size-64 rounded-full bg-[#c9a86a]/10 blur-3xl"
          />
          <Link href="/panel" className="relative mb-8 flex items-center gap-3 px-2">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/10 shadow-[0_14px_35px_rgba(201,168,106,.2)]">
              <BrandMark className="size-8" tone="onDark" />
            </span>
            <span>
              <span className="block font-serif text-xl leading-none">
                Ravza Randevu
              </span>
              <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">
                Ravza operasyonu
              </span>
            </span>
          </Link>

          <nav aria-label="Ana menü" className="relative space-y-6">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-white/30">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = href === activePath;
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all ${active ? 'bg-white text-[#071c14] shadow-[0_12px_30px_rgba(0,0,0,.18)]' : 'text-white/58 hover:bg-white/8 hover:text-white'}`}
                      >
                        <Icon
                          aria-hidden="true"
                          className={`size-[18px] ${active ? 'text-[#80652f]' : 'text-white/45 group-hover:text-[#d2b77b]'}`}
                        />
                        <span className="flex-1">{label}</span>
                        {active && (
                          <ChevronRight className="size-4 text-[#80652f]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="relative mt-7 rounded-2xl border border-white/10 bg-white/[.06] p-4 text-xs backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-[#d2b77b] font-semibold text-[#071c14]">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm text-white">
                  {user.displayName}
                </strong>
                <span className="mt-0.5 block text-white/45">
                  {user.role === 'SUPER_ADMIN'
                    ? 'Süper yönetici'
                    : user.role === 'AGENCY_ADMIN'
                      ? 'Acente yöneticisi'
                      : 'Operasyon kullanıcısı'}
                </span>
              </span>
            </div>
            <SignOutButton
              fallbackHref="/admin"
              className="mt-4 inline-flex font-semibold text-[#e6ce98] hover:text-white"
            />
          </div>

          <div className="relative mt-auto rounded-2xl border border-[#d2b77b]/20 bg-[#d2b77b]/10 p-4 text-xs leading-5 text-white/55">
            <span className="mb-2 flex items-center gap-2 font-semibold uppercase tracking-[.12em] text-[#e6ce98]">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,.1)]" />
              Güvenli mod
            </span>
            Canlı takvim salt okunur;
            satın alma ve QR yazma kapıları insan onayı bekliyor.
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-black/5 bg-[#eef1ed]/88 px-4 py-3 backdrop-blur-2xl sm:px-7 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80652f]">
                  {eyebrow}
                </p>
                <h1 className="truncate font-serif text-2xl tracking-[-.025em] sm:text-[1.75rem]">
                  {title}
                </h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CreditPill />
              </div>
            </div>
            <nav
              aria-label="Mobil menü"
              className="premium-horizontal mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden"
            >
              {mobileItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-medium ${href === activePath ? 'border-primary bg-primary text-primary-foreground' : 'border-black/5 bg-white/75 text-foreground/65'}`}
                >
                  <Icon className="size-3.5" /> {label}
                </Link>
              ))}
            </nav>
          </header>
          <div className="px-4 py-6 sm:px-7 lg:px-10 lg:py-9">{children}</div>
        </section>
      </div>
    </main>
  );
}


