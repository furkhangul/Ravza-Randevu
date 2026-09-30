import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { LegalProfile } from '@/lib/legal-config';

export function LegalDraftBanner({ profile }: { profile: LegalProfile }) {
  return (
    <div
      className={`mb-6 rounded-2xl border p-4 text-sm leading-6 ${profile.complete ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}
    >
      <div className="flex gap-3">
        {profile.complete ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        )}
        <div>
          <strong className="block">
            {profile.complete
              ? 'Şirket bilgileri tamamlandı; yürürlük için hukuk onayı beklenmektedir.'
              : 'Çalışma metni · hukuk onayı sürüyor'}
          </strong>
          {!profile.complete && (
            <span>
              Bu metin hazırlanma aşamasındadır ve hukuk onayı tamamlanmadan
              bağlayıcı sözleşme yerine geçmez.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
