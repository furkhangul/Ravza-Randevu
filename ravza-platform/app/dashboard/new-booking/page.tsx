import { permanentRedirect } from 'next/navigation';

/** Panel yedi ekrana indirildi; eski adres yeni yüzeye taşınır. */
export default function DashboardNewBookingRedirect(): never {
  permanentRedirect('/panel/randevular');
}
