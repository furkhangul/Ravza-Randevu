export async function GET() {
  return Response.json({
    status: 'ok',
    mode:
      process.env.RAWDAH_LIVE_ENABLED === 'true'
        ? 'live-read-demo-write'
        : 'synthetic-demo',
    liveProviderReadEnabled: process.env.RAWDAH_LIVE_ENABLED === 'true',
    liveProviderWriteEnabled: process.env.RAWDAH_WRITE_ENABLED === 'true',
    qrSchedulerEnabled: false,
    creativeAutoPublishEnabled: false,
  });
}
