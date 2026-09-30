import { PasswordResetConfirm } from '@/components/password-reset-flow';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Yeni parola · Ravza Randevu' };

export default async function PasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  return <PasswordResetConfirm token={token} />;
}
