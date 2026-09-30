import {
  createMember,
  findAgencyMember,
  findMemberByEmail,
  listMembers,
  MAX_MEMBERS,
  resetMemberPassword,
  setMemberStatus,
} from '@/db/agencies';
import { requireAgencyApi } from '@/lib/agency-auth';
import { hashPassword } from '@/lib/auth-crypto';
import { notifyMemberInvited, notifyPasswordReset } from '@/lib/notify';
import { normalizePhone } from '@/lib/quote-request';
import { overRateLimit } from '@/lib/rate-limit';
import { temporaryPassword } from '@/lib/temp-password';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** Ekip yönetimi yalnız acente sahibine açıktır; çalışan (staff) randevu alır ama ekibi yönetemez. */
async function requireOwner() {
  const auth = await requireAgencyApi();
  if (!auth.ok) return auth;
  if (auth.context.member.role !== 'owner')
    return { ok: false as const, response: reply({ error: 'Bu işlem yalnız acente sahibine açıktır.' }, 403) };
  return auth;
}

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const members = await listMembers(auth.context.agency.id);
  return reply({
    members: members.map(({ id, email, fullName, phone, role, status, lastLoginAt, createdAt }) => ({
      id, email, fullName, phone, role, status, lastLoginAt, createdAt, self: id === auth.context.member.id,
    })),
    max: MAX_MEMBERS,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'invalid_origin' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'Geçersiz istek.' }, 400);
  }
  const { agency, member: owner } = auth.context;
  try {
    if (await overRateLimit(`agency-team:${agency.id}`, 30, 3600)) return reply({ error: 'Çok fazla işlem. Biraz sonra tekrar deneyin.' }, 429);

    if (body.action === 'invite') {
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
      const phoneRaw = typeof body.phone === 'string' ? body.phone : '';
      const phone = phoneRaw.trim() ? normalizePhone(phoneRaw) : '';
      const role = body.role === 'owner' ? 'owner' : 'staff';
      if (fullName.length < 3) return reply({ error: 'Çalışanın adını yazın.', field: 'fullName' }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'E-posta adresi geçersiz.', field: 'email' }, 400);
      if (phone === null) return reply({ error: 'Telefon numarası geçersiz.', field: 'phone' }, 400);
      if ((await listMembers(agency.id)).length >= MAX_MEMBERS) return reply({ error: `En fazla ${MAX_MEMBERS} kullanıcı eklenebilir.` }, 409);
      if (await findMemberByEmail(email)) return reply({ error: 'Bu e-posta ile bir acente kullanıcısı zaten var.', field: 'email' }, 409);
      const password = temporaryPassword();
      const id = await createMember({ agencyId: agency.id, email, fullName, phone: phone ?? '', role, password: await hashPassword(password) });
      await notifyMemberInvited(agency, { id, fullName, email }, { invitedBy: owner.fullName, temporaryPassword: password });
      return reply({ ok: true, temporaryPassword: password, email }, 201);
    }

    const memberId = typeof body.memberId === 'string' ? body.memberId : '';
    const target = await findAgencyMember(agency.id, memberId);
    if (!target) return reply({ error: 'Kullanıcı bulunamadı.' }, 404);
    if (target.id === owner.id) return reply({ error: 'Kendi hesabınız için bu işlemi yapamazsınız; şifrenizi "Şifre değiştir" bölümünden değiştirin.' }, 409);

    if (body.action === 'suspend' || body.action === 'activate') {
      await setMemberStatus(target.id, body.action === 'suspend' ? 'suspended' : 'active');
      return reply({ ok: true });
    }
    if (body.action === 'resetPassword') {
      const password = temporaryPassword();
      await resetMemberPassword(target.id, await hashPassword(password));
      await notifyPasswordReset(agency, target, password);
      return reply({ ok: true, temporaryPassword: password, email: target.email });
    }
    return reply({ error: 'invalid_action' }, 400);
  } catch {
    return reply({ error: 'İşlem şu anda yapılamadı.' }, 503);
  }
}
