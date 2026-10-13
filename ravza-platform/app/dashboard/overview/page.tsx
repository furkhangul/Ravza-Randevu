import { permanentRedirect } from 'next/navigation';

/** Panel yedi ekrana indirildi; eski adres yeni yüzeye taşınır. */
export default function DashboardOverviewRedirect(): never {
  permanentRedirect('/panel');
}
