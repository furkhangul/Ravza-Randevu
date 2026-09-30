import { authorizeApi } from '@/lib/app-auth';
import { createLiveRawdahProviderFromEnv } from '@/packages/provider-rawdah/src';

const PRIVATE_NO_STORE = {
  'cache-control': 'private, no-store, max-age=0',
  pragma: 'no-cache',
};

export async function GET() {
  const authorization = await authorizeApi();
  if (!authorization.ok) {
    return Response.json(
      { error: authorization.error },
      { status: authorization.status, headers: PRIVATE_NO_STORE },
    );
  }
  if (process.env.RAWDAH_LIVE_ENABLED !== 'true') {
    return Response.json(
      { error: 'live_read_disabled' },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }

  try {
    const provider = createLiveRawdahProviderFromEnv();
    const groups = await provider.getQrGroups();
    return Response.json(
      {
        synthetic: false,
        source: 'rawdahbooking',
        mode: 'read-only',
        writeEnabled: false,
        groups,
      },
      { headers: PRIVATE_NO_STORE },
    );
  } catch (caught) {
    const diagnostic =
      caught instanceof Error ? caught.message : 'Unknown provider error.';
    return Response.json(
      {
        error: 'provider_qr_groups_failed',
        ...(process.env.NODE_ENV === 'development' ? { diagnostic } : {}),
      },
      { status: 502, headers: PRIVATE_NO_STORE },
    );
  }
}
