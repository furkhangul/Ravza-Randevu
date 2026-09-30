import Link from '@/components/safe-link';

const tabs = [
  { key: 'customer', href: '/login', label: 'Müşteri' },
  { key: 'agency', href: '/acente/giris', label: 'Acente / Şirket' },
  { key: 'staff', href: '/admin', label: 'Yönetici' },
] as const;

/** Giriş türleri: müşteri, acente/şirket ve yönetici hesapları birbirinden ayrıdır. */
export function LoginTabs({ active }: { active: (typeof tabs)[number]['key'] }) {
  return (
    <nav aria-label="Giriş türü" className="grid grid-cols-3 gap-1 rounded-2xl bg-black/25 p-1 text-center text-xs font-semibold sm:text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className={`rounded-xl px-2 py-2.5 transition ${
            tab.key === active ? 'bg-[#d2b77b] text-[#071c14]' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
