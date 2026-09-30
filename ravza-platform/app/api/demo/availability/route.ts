import { MockRawdahProvider } from '@/packages/provider-rawdah/src';
import { authorizeApi } from '@/lib/app-auth';

export async function GET(request: Request) {
  const authorization = await authorizeApi();
  if (!authorization.ok)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '2026-09-05';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: 'invalid_date', expected: 'yyyy-MM-dd' },
      { status: 400 },
    );
  }
  const provider = new MockRawdahProvider();
  const availability = await provider.getAvailability(date);
  return Response.json({
    synthetic: true,
    timezone: 'Asia/Riyadh',
    hasBalance: availability.hasBalance,
    slots: availability.slots,
  });
}
