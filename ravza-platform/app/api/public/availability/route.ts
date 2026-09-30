import { createLiveRawdahProviderFromEnv } from '@/packages/provider-rawdah/src';
import { isValidIsoDate, riyadhToday } from '@/lib/date-validation';

const PUBLIC_CACHE = {
  'cache-control': 'no-store',
};

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date') ?? '';
  const today = riyadhToday();
  const lastDate = new Date(`${today}T00:00:00Z`);
  lastDate.setUTCDate(lastDate.getUTCDate() + 90);
  const lastDateIso = lastDate.toISOString().slice(0, 10);

  if (!isValidIsoDate(date) || date < today || date > lastDateIso)
    return Response.json(
      { error: 'invalid_date' },
      { status: 400, headers: PUBLIC_CACHE },
    );

  if (process.env.RAWDAH_LIVE_ENABLED !== 'true')
    return Response.json(
      { error: 'live_read_disabled' },
      { status: 503, headers: PUBLIC_CACHE },
    );

  try {
    const provider = createLiveRawdahProviderFromEnv();
    const availability = await provider.getAvailability(date);
    return Response.json(
      {
        date,
        timezone: 'Asia/Riyadh',
        slots: availability.slots.map(
          ({ timeSlot, window, gender, available }) => ({
            timeSlot,
            window,
            gender,
            available,
          }),
        ),
      },
      { headers: PUBLIC_CACHE },
    );
  } catch {
    return Response.json(
      { error: 'provider_read_failed' },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  }
}
