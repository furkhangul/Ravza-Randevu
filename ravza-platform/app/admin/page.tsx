import { LoginExperience } from '@/components/login-experience';
import { getPortalUser } from '@/lib/current-user';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const user = await getPortalUser();
  return <LoginExperience signedIn={user?.audience === 'staff'} staff googleEnabled={false} returnTo="/panel" accountHref="/panel" />;
}
