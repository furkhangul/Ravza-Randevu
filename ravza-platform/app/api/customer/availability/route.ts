import {
  createLiveRawdahProviderFromEnv,
  MockRawdahProvider,
} from '@/packages/provider-rawdah/src';

const NO_STORE = {
  'cache-control': 'private, no-store, max-age=0',
  pragma: 'no-cache',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: 'invalid_date', expected: 'yyyy-MM-dd' },
      { status: 400, headers: NO_STORE },
    );
  }

  const live =
    process.env.CUSTOMER_LIVE_AVAILABILITY_ENABLED === 'true' &&
    process.env.RAWDAH_LIVE_ENABLED === 'true';
  const provider = live
    ? createLiveRawdahProviderFromEnv()
    : new MockRawdahProvider();

  try {
    const availability = await provider.getAvailability(date);
    return Response.json(
      {
        synthetic: !live,
        source: live ? 'rawdahbooking' : 'preview',
        timezone: 'Asia/Riyadh',
        slots: availability.slots,
      },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'availability_unavailable' },
      { status: 502, headers: NO_STORE },
    );
  }
}
