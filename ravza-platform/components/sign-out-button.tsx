'use client';
import { useState } from 'react';

/**
 * Çıkış düğmesi. Önce sunucudaki oturum kaydını düşürür (Google veya parola
 * ile girilmişse), sonra ChatGPT oturumu için verilen adrese gider. İki giriş
 * yolundan hangisi kullanılmışsa doğru olan temizlenmiş olur.
 */
export function SignOutButton({
  fallbackHref,
  className,
  label = 'Güvenli çıkış',
}: {
  fallbackHref: string;
  className?: string;
  label?: string;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' });
      if (!response.ok) throw new Error('signout_failed');
      window.location.assign(fallbackHref);
    } catch {
      setError('Çıkış yapılamadı. Lütfen tekrar deneyin.');
      setBusy(false);
    }
  }

  return (
    <span>
      <button type="button" disabled={busy} onClick={signOut} className={className}>
        {busy ? 'Çıkış yapılıyor…' : label}
      </button>
      {error && <span role="alert" className="block text-xs">{error}</span>}
    </span>
  );
}
