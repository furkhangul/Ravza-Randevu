import { permanentRedirect } from 'next/navigation';

/**
 * Dört adımlı ödemeli rezervasyon akışı kaldırıldı: tahsilat site
 * üzerinden yapılmıyor. Eski bağlantılar sipariş asistanına taşınır.
 */
export default function BookPage(): never {
  permanentRedirect('/siparis');
}
