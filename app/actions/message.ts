'use server';

import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leagueMembers, messages, users } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';

const MAX_BODY_LENGTH = 500;
const RETENTION_DAYS = 30;

async function assertLeagueAccess(userId: string, leagueId: string, isAdmin: boolean) {
  if (isAdmin) return;
  const [member] = await db
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)));
  if (!member) throw new Error('Not a member of this league.');
}

export async function sendMessage(leagueId: string, body: string) {
  const user = await getCurrentUser();
  await assertLeagueAccess(user.id, leagueId, user.isAdmin);

  const trimmed = body.trim().slice(0, MAX_BODY_LENGTH);
  if (!trimmed) return { error: 'Message cannot be empty.' };

  await db.insert(messages).values({ leagueId, userId: user.id, body: trimmed });

  return { success: true };
}

export async function getMessages(leagueId: string) {
  const user = await getCurrentUser();
  await assertLeagueAccess(user.id, leagueId, user.isAdmin);

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  return db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      userId: messages.userId,
      userName: users.name,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.userId))
    .where(and(eq(messages.leagueId, leagueId), gt(messages.createdAt, cutoff)))
    .orderBy(asc(messages.createdAt));
}
