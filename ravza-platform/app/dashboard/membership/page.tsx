import { permanentRedirect } from 'next/navigation';

/** Panel yedi ekrana indirildi; eski adres yeni yüzeye taşınır. */
export default function DashboardMembershipRedirect(): never {
  permanentRedirect('/panel/kontor?sekme=haklar');
}
