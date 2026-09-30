import { createLiveRawdahProviderFromEnv } from '@/packages/provider-rawdah/src';
import { authorizeApi } from '@/lib/app-auth';

const PRIVATE_NO_STORE = {
  'cache-control': 'private, no-store, max-age=0',
  pragma: 'no-cache',
};

export async function GET(request: Request) {
  const authorization = await authorizeApi();
  if (!authorization.ok)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status, headers: PRIVATE_NO_STORE },
    );
  if (process.env.RAWDAH_LIVE_ENABLED !== 'true') {
    return Response.json(
      { error: 'live_read_disabled' },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: 'invalid_date', expected: 'yyyy-MM-dd' },
      { status: 400, headers: PRIVATE_NO_STORE },
    );
  }

  try {
    const provider = createLiveRawdahProviderFromEnv();
    const availability = await provider.getAvailability(date);
    return Response.json(
      {
        synthetic: false,
        source: 'rawdahbooking',
        mode: 'read-only',
        writeEnabled: false,
        timezone: 'Asia/Riyadh',
        date,
        hasBalance: availability.hasBalance,
        slots: availability.slots,
      },
      { headers: PRIVATE_NO_STORE },
    );
  } catch (caught) {
    const diagnostic =
      caught instanceof Error ? caught.message : 'Unknown provider error.';
    return Response.json(
      {
        error: 'provider_read_failed',
        ...(process.env.NODE_ENV === 'development' ? { diagnostic } : {}),
      },
      { status: 502, headers: PRIVATE_NO_STORE },
    );
  }
}
