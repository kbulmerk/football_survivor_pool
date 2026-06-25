import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  phone: text('phone').unique(),
  name: text('name'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const leagues = pgTable('leagues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  season: integer('season').notNull(),
  buyIn: numeric('buy_in', { precision: 10, scale: 2 }).notNull().default('20'),
  venmoHandle: text('venmo_handle').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const leagueMembers = pgTable('league_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isPaid: boolean('is_paid').notNull().default(false),
  isAlive: boolean('is_alive').notNull().default(true),
  eliminatedWeek: integer('eliminated_week'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  week: integer('week').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  startTime: timestamp('start_time').notNull(),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  winner: text('winner'), // team name, or null if pending
  isExcluded: boolean('is_excluded').notNull().default(false),
});

export const picks = pgTable(
  'picks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    week: integer('week').notNull(),
    teamPicked: text('team_picked').notNull(), // team picked to LOSE
    isLocked: boolean('is_locked').notNull().default(false),
    result: text('result').$type<'pending' | 'correct' | 'eliminated'>().default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.leagueId, t.userId, t.week)]
);

export const weekConfig = pgTable(
  'week_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    week: integer('week').notNull(),
    deadline: timestamp('deadline').notNull(),
    isOpen: boolean('is_open').notNull().default(false),
    isLocked: boolean('is_locked').notNull().default(false),
    isEvaluated: boolean('is_evaluated').notNull().default(false),
  },
  (t) => [unique().on(t.leagueId, t.week)]
);

export const paymentStatus = pgTable('payment_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  markedPaidAt: timestamp('marked_paid_at').defaultNow().notNull(),
  markedBy: text('marked_by').references(() => users.id),
});

export type User = typeof users.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type LeagueMember = typeof leagueMembers.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Pick = typeof picks.$inferSelect;
export type WeekConfig = typeof weekConfig.$inferSelect;
export type PaymentStatus = typeof paymentStatus.$inferSelect;
