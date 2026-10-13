import { LandingContent } from '@/components/landing-content';
import { PublicShell } from '@/components/public-shell';
import { listFeedback } from '@/db/feedback';
import type { FeedbackRecord } from '@/lib/feedback';

export const metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  let feedback: FeedbackRecord[] = [];

  try {
    // Yalnız onaylanmış gerçek yorumlar yayımlanır; yoksa bölüm çıkmaz.
    feedback = (await listFeedback({ status: 'published', limit: 6 })).filter(
      (item) => item.rating > 0,
    );
  } catch {
    feedback = [];
  }

  return (
    <PublicShell>
      <LandingContent feedback={feedback} />
    </PublicShell>
  );
}
