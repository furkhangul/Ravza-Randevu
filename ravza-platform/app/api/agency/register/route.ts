import { createAgencyApplication, findAgencyByTaxNumber, findMemberByEmail } from '@/db/agencies';
import { hashPassword } from '@/lib/auth-crypto';
import { parseAgencyApplication } from '@/lib/agency-validation';
import { notifyAgencyApplied } from '@/lib/notify';
import { clientIp, overRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** Acente / şirket başvurusu. Hesap "inceleniyor" açılır; yönetici onaylamadan giriş yapılamaz. */
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'invalid_origin' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'Geçersiz istek.' }, 400);
  }
  const parsed = parseAgencyApplication(body);
  if (!parsed.ok) return reply({ error: parsed.error, field: parsed.field }, 400);
  try {
    if (await overRateLimit(`agency-register:${clientIp(request)}`, 5, 3600))
      return reply({ error: 'Çok fazla başvuru denemesi. Lütfen bir saat sonra tekrar deneyin.' }, 429);
    if (await findMemberByEmail(parsed.value.contactEmail))
      return reply({ error: 'Bu e-posta ile bir acente hesabı zaten var. Giriş yapmayı deneyin.', field: 'contactEmail' }, 409);
    if (await findAgencyByTaxNumber(parsed.value.taxNumber))
      return reply({ error: 'Bu vergi numarasıyla daha önce başvuru yapılmış. Bizimle iletişime geçin.', field: 'taxNumber' }, 409);
    const { agencyId } = await createAgencyApplication({
      ...parsed.value,
      password: await hashPassword(parsed.value.password),
    });
    await notifyAgencyApplied({ id: agencyId, ...parsed.value });
    return reply({ ok: true }, 201);
  } catch {
    return reply({ error: 'Başvuru şu anda alınamadı. Lütfen tekrar deneyin.' }, 503);
  }
}
