import { permanentRedirect } from 'next/navigation';

/** Panel yedi ekrana indirildi; eski adres yeni yüzeye taşınır. */
export default function DashboardOrdersRedirect(): never {
  permanentRedirect('/panel/talepler?sekme=kayitlar');
}
