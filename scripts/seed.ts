import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
const postgres = require('postgres');
import * as bcrypt from 'bcryptjs';

import { users, tasks } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const client = postgres(databaseUrl);
const db = drizzle(client);

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create Super Admin
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const [admin] = await db.insert(users).values({
    id: uuidv4(),
    name: 'Nitin Rai',
    email: 'nitin@atyant.in',
    passwordHash: adminPassword,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    joinedAt: new Date().toISOString(),
  }).onConflictDoNothing().returning();

  const adminId = admin?.id || (await db.select().from(users).where(eq(users.email, 'nitin@atyant.in')).limit(1))[0]?.id;

  console.log('✅ Super Admin created');

  // 2. Create Managers
  const squads = ['TECH', 'OU', 'CONTENT', 'PRODUCT', 'HR'];
  const managers = [];

  for (const squad of squads) {
    const managerEmail = `${squad.toLowerCase()}.lead@atyant.in`;
    const password = await bcrypt.hash('Manager@123', 12);
    
    const [manager] = await db.insert(users).values({
      id: uuidv4(),
      name: `${squad} Manager`,
      email: managerEmail,
      passwordHash: password,
      role: 'MANAGER',
      squad: squad as any,
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
      invitedBy: adminId,
    }).onConflictDoNothing().returning();

    if (manager) managers.push(manager);
    console.log(`✅ Manager for ${squad} created`);
  }

  // 3. Create Sample Tasks
  // Assign tasks to the first manager
  const sampleAssigneeId = managers[0]?.id || adminId;

  const sampleTasks = [
    { title: 'Setup Backend RBAC', squad: 'TECH', priority: 'HIGH', status: 'DONE' },
    { title: 'Design Performance Dashboard', squad: 'PRODUCT', priority: 'MEDIUM', status: 'IN_PROGRESS' },
    { title: 'Draft Marketing Newsletter', squad: 'OU', priority: 'LOW', status: 'TODO' },
    { title: 'Review Intern Onboarding', squad: 'HR', priority: 'MEDIUM', status: 'TODO' },
    { title: 'Update Drizzle Schema', squad: 'TECH', priority: 'HIGH', status: 'TODO' },
  ];

  for (const t of sampleTasks) {
    await db.insert(tasks).values({
      id: uuidv4(),
      title: t.title,
      squad: t.squad as any,
      priority: t.priority as any,
      status: t.status as any,
      assignedById: adminId,
      assignedToId: sampleAssigneeId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  console.log('✅ Sample tasks created');
  console.log('✨ Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

