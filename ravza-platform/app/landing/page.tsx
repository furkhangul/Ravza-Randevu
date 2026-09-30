import { permanentRedirect } from 'next/navigation';

/** Açılış sayfası kök adrese taşındı; eski bağlantılar korunur. */
export default function LandingPage(): never {
  permanentRedirect('/');
}
