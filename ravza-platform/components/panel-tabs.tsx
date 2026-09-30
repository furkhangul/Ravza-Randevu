import Link from '@/components/safe-link';

/**
 * Birleştirilmiş ekranlarda bölüm geçişi. Durum adres çubuğunda
 * tutulur: bağlantı paylaşılabilir, geri tuşu çalışır ve sunucu
 * bileşeni olarak kalır.
 */
export function PanelTabs({
  basePath,
  param = 'sekme',
  current,
  tabs,
}: {
  basePath: string;
  param?: string;
  current: string;
  tabs: Array<{ key: string; label: string }>;
}) {
  return (
    <nav
      aria-label="Bölümler"
      className="premium-horizontal mb-6 flex gap-2 overflow-x-auto pb-1"
    >
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={
              tab.key === tabs[0].key
                ? basePath
                : `${basePath}?${param}=${tab.key}`
            }
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-xs font-medium transition ${
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-black/5 bg-white/75 text-foreground/65 hover:bg-white'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export async function readTab(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  allowed: string[],
  param = 'sekme',
): Promise<string> {
  const params = await searchParams;
  const raw = params[param];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && allowed.includes(value) ? value : allowed[0];
}
