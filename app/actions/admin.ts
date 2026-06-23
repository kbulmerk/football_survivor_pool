'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { games, leagueMembers, paymentStatus, weekConfig } from '@/lib/schema';
import { requireAdmin } from '@/lib/auth';

export async function markPaid(leagueId: string, userId: string, amount: number) {
  const admin = await requireAdmin();

  await db
    .update(leagueMembers)
    .set({ isPaid: true })
    .where(
      and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId))
    );

  await db.insert(paymentStatus).values({
    leagueId,
    userId,
    amount: String(amount),
    markedBy: admin.id,
  });

  revalidatePath('/admin');
  revalidatePath('/league');
}

export async function setDeadline(leagueId: string, week: number, deadline: Date) {
  await requireAdmin();

  await db
    .insert(weekConfig)
    .values({ leagueId, week, deadline, isOpen: true })
    .onConflictDoUpdate({
      target: [weekConfig.leagueId, weekConfig.week],
      set: { deadline, isOpen: true, isLocked: false },
    });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

export async function excludeGame(gameId: string, excluded: boolean) {
  await requireAdmin();

  await db.update(games).set({ isExcluded: excluded }).where(eq(games.id, gameId));

  revalidatePath('/admin');
  revalidatePath('/pick');
}

export async function overrideElimination(leagueId: string, userId: string, isAlive: boolean) {
  await requireAdmin();

  await db
    .update(leagueMembers)
    .set({ isAlive, eliminatedWeek: isAlive ? null : undefined })
    .where(
      and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId))
    );

  revalidatePath('/admin');
  revalidatePath('/league');
}

export async function openWeek(leagueId: string, week: number) {
  await requireAdmin();

  await db
    .update(weekConfig)
    .set({ isOpen: true, isLocked: false })
    .where(and(eq(weekConfig.leagueId, leagueId), eq(weekConfig.week, week)));

  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

export async function lockWeek(leagueId: string, week: number) {
  await requireAdmin();

  await db
    .update(weekConfig)
    .set({ isLocked: true })
    .where(and(eq(weekConfig.leagueId, leagueId), eq(weekConfig.week, week)));

  revalidatePath('/admin');
}

export async function upsertGame(
  leagueId: string,
  week: number,
  homeTeam: string,
  awayTeam: string,
  startTime: Date,
  winner?: string
) {
  await requireAdmin();

  await db.insert(games).values({
    leagueId,
    week,
    homeTeam,
    awayTeam,
    startTime,
    winner: winner ?? null,
  });

  revalidatePath('/admin');
  revalidatePath('/pick');
}
