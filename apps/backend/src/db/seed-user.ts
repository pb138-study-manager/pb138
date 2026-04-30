import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

const AUTH_ID = '512a5542-ace1-4c95-a8fe-cf552e5b8e17';

const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.authId, AUTH_ID));

if (existing) {
  console.log('User already exists with id:', existing.id);
} else {
  const [inserted] = await db.insert(users).values({
    authId: AUTH_ID,
    email: 'perveka.peter@gmail.com',
    login: 'peter',
    pwdHash: 'supabase-managed',
    activeSession: false,
  }).returning({ id: users.id });
  console.log('User inserted with id:', inserted.id);
}

process.exit(0);
