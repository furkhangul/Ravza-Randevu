import { FeedbackForm } from '@/components/feedback-form';
import { PublicShell } from '@/components/public-shell';
import { findFeedbackInvite } from '@/db/feedback';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Değerlendirme · Ravza Randevu',
  robots: { index: false, follow: false },
};

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const clean = decodeURIComponent(token).trim();

  let state: 'valid' | 'used' | 'invalid' = 'invalid';
  if (/^[0-9a-f]{32}$/.test(clean)) {
    try {
      const invite = await findFeedbackInvite(clean);
      if (invite) state = invite.submitted ? 'used' : 'valid';
    } catch {
      state = 'invalid';
    }
  }

  return (
    <PublicShell>
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Değerlendirme
          </p>
          <h1 className="mt-3 font-heading text-4xl leading-tight">
            Deneyiminizi anlatır mısınız?
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Bu bağlantı yalnız size özeldir ve bir kez kullanılabilir.
            Yazdıklarınız değiştirilmeden, yalnız yayın onayından sonra
            görünür.
          </p>

          <div className="mt-8">
            {state === 'valid' ? (
              <FeedbackForm token={clean} />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <h2 className="font-heading text-2xl">
                  {state === 'used'
                    ? 'Bu davet daha önce kullanıldı'
                    : 'Bağlantı geçersiz veya süresi dolmuş'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {state === 'used'
                    ? 'Değerlendirmeniz bize ulaştı, teşekkür ederiz.'
                    : 'Davet bağlantıları 14 gün geçerlidir. Yeni bir bağlantı için bize ulaşabilirsiniz.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
