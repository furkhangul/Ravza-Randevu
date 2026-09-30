export type AppRole = 'SUPER_ADMIN' | 'AGENCY_ADMIN' | 'STAFF';

export type RoleEnvironment = {
  APP_ADMIN_EMAILS?: string;
  APP_SUPER_ADMIN_EMAILS?: string;
};

function emailSet(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveAppRole(
  email: string,
  env: RoleEnvironment = {
    APP_ADMIN_EMAILS: process.env.APP_ADMIN_EMAILS,
    APP_SUPER_ADMIN_EMAILS: process.env.APP_SUPER_ADMIN_EMAILS,
  },
): AppRole {
  const normalized = email.trim().toLowerCase();
  if (emailSet(env.APP_SUPER_ADMIN_EMAILS).has(normalized))
    return 'SUPER_ADMIN';
  if (emailSet(env.APP_ADMIN_EMAILS).has(normalized)) return 'AGENCY_ADMIN';
  return 'STAFF';
}
