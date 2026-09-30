import type { ReactNode } from 'react';

/**
 * `/dashboard/*` adreslerinin tamamı `/panel/*` yüzeyine yönlendirir.
 * Yetki kontrolü hedef ekranlarda yapıldığı için burada oturum
 * beklenmez; aksi hâlde ziyaretçi yönlendirme yerine giriş ekranına
 * düşerdi.
 */
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
