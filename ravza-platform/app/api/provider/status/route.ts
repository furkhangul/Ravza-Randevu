import { authorizeApi } from '@/lib/app-auth';

export async function GET() {
  const authorization = await authorizeApi();
  if (!authorization.ok)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  return Response.json({
    configured: Boolean(
      process.env.RAWDAH_EMAIL && process.env.RAWDAH_PASSWORD,
    ),
    liveReadEnabled: process.env.RAWDAH_LIVE_ENABLED === 'true',
    liveWriteEnabled: process.env.RAWDAH_WRITE_ENABLED === 'true',
    livePdfExportEnabled: process.env.RAWDAH_PDF_EXPORT_ENABLED === 'true',
    liveShareLinkEnabled: process.env.RAWDAH_SHARE_LINK_ENABLED === 'true',
    mode: 'read-only',
  });
}
