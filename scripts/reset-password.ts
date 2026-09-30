/**
 * One-off password reset script.
 *
 * Usage:
 *   npx ts-node scripts/reset-password.ts <email> <newPassword> [connectionString]
 *
 * Reads DATABASE_URL from the environment (same as the app) unless an
 * explicit [connectionString] is passed as the 3rd argument (e.g. a direct,
 * non-pooler Supabase connection string), hashes the given password with
 * bcrypt (matching src/auth/auth.service.ts), and updates that user's
 * passwordHash directly.
 *
 * Delete this file when you're done — it's not meant to stay in the repo.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcryptjs';
import * as postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { users } from '../drizzle/schema';

async function main() {
  const [email, newPassword, connectionStringArg] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error(
      'Usage: npx ts-node scripts/reset-password.ts <email> <newPassword> [connectionString]',
    );
    process.exit(1);
  }

  const connectionString = connectionStringArg || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in the environment and no connectionString argument was given.');
    process.exit(1);
  }

  const client = (postgres as any)(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    const [existing] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!existing) {
      console.error(`No user found with email ${email}`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(users.id, existing.id));

    console.log(`Password reset for ${existing.email} (role: ${existing.role}).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
