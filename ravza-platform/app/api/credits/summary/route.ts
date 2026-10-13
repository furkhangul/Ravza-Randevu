import { authorizeApi } from '@/lib/app-auth';
import { createLiveRawdahProviderFromEnv } from '@/packages/provider-rawdah/src';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );
  }
  if (process.env.RAWDAH_LIVE_ENABLED !== 'true') {
    return Response.json(
      { error: 'live_read_disabled' },
      { status: 503, headers: NO_STORE },
    );
  }
  try {
    const remaining =
      await createLiveRawdahProviderFromEnv().getAppointmentBalance();
    return Response.json(
      {
        source: 'rawdahbooking',
        remaining,
        fetchedAt: new Date().toISOString(),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    // Nedeni sunucu loguna yazılır; parola/token mesajlarda yer almaz.
    console.error(
      '[credits/summary]',
      error instanceof Error ? error.message : error,
    );
    // Okunamayan bakiye sıfır veya örnek defter toplamı olarak gösterilmez.
    return Response.json(
      { error: 'credit_summary_unavailable' },
      { status: 502, headers: NO_STORE },
    );
  }
}
