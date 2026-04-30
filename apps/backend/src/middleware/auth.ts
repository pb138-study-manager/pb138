import { Elysia } from 'elysia';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { db } from '../db';
import { users, userRoles, roles } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export type AuthUser = { id: number; roles: string[] };

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

async function resolveUser(token: string): Promise<AuthUser | null> {
  if (!SUPABASE_URL) return null;

  let sub: string;
  try {
    const { payload } = await jwtVerify(token, JWKS);
    if (!payload.sub) return null;
    sub = payload.sub;
  } catch {
    return null;
  }

  const [localUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.authId, sub), isNull(users.deletedAt)));

  if (!localUser) return null;

  const userRoleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, localUser.id));

  return { id: localUser.id, roles: userRoleRows.map((r) => r.name as string) };
}

// Provides { user: AuthUser | null } in context.
// Route plugins must add their own onBeforeHandle to enforce authentication.
export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ headers }) => {
    const token = headers.authorization?.replace('Bearer ', '');
    if (!token) return { user: null as AuthUser | null };
    return { user: await resolveUser(token) };
  })
  .as('global');
