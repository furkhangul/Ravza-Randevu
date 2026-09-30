import { listUmrahPackages } from '@/db/catalog';

const NO_STORE = { 'cache-control': 'public, max-age=30, s-maxage=60' };

export async function GET() {
  try {
    return Response.json(
      { packages: await listUmrahPackages({ publishedOnly: true }) },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'package_catalog_unavailable' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
