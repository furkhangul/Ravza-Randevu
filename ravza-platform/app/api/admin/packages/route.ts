import { listUmrahPackages, saveUmrahPackage } from '@/db/catalog';
import { authorizeApi } from '@/lib/app-auth';
import { parsePackageInput } from '@/lib/package-catalog';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

export async function GET() {
  const authorization = await authorizeApi(['SUPER_ADMIN', 'AGENCY_ADMIN']);
  if (!authorization.ok)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status, headers: NO_STORE },
    );
  try {
    return Response.json(
      { packages: await listUmrahPackages() },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'package_catalog_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(['SUPER_ADMIN', 'AGENCY_ADMIN']);
  if (!authorization.ok)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status, headers: NO_STORE },
    );
  const requestUrl = new URL(request.url);
  if (request.headers.get('origin') !== requestUrl.origin)
    return Response.json(
      { error: 'same_origin_required' },
      { status: 403, headers: NO_STORE },
    );
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    return Response.json(
      { error: 'json_content_type_required' },
      { status: 415, headers: NO_STORE },
    );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'invalid_json' },
      { status: 400, headers: NO_STORE },
    );
  }
  const parsed = parsePackageInput(body);
  if (!parsed.ok)
    return Response.json(
      { error: parsed.error },
      { status: 400, headers: NO_STORE },
    );

  try {
    await saveUmrahPackage(parsed.value, authorization.user.userId);
    const packages = await listUmrahPackages();
    return Response.json(
      {
        ok: true,
        package: packages.find((item) => item.id === parsed.value.id),
        packages,
      },
      { status: 201, headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'package_save_failed' },
      { status: 500, headers: NO_STORE },
    );
  }
}
