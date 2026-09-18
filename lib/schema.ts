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
  status: text('status').$type<'active' | 'completed' | 'deleted'>().notNull().default('active'),
  // Discriminator between the two pool types. Existing rows backfill to 'survivor'.
  gameType: text('game_type').$type<'survivor' | 'squares'>().notNull().default('survivor'),
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

// ----------------------------------------------------------------------------
// Squares pools (gameType = 'squares'). One config row per squares league, tied
// to a single NFL game. Survivor leagues never touch these tables.
// ----------------------------------------------------------------------------

export const squaresConfig = pgTable('squares_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' })
    .unique(),
  // Tracked NFL game, snapshotted from ESPN at creation (squares pools do not
  // seed the games table).
  espnGameId: text('espn_game_id').notNull(),
  week: integer('week').notNull(),
  season: integer('season').notNull(),
  // ESPN season type: 2 = regular season, 3 = postseason (playoffs + Super Bowl).
  seasonType: integer('season_type').notNull().default(2),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  startTime: timestamp('start_time').notNull(),
  // Per-quarter payout percentages. Must sum to 100.
  payoutQ1: integer('payout_q1').notNull().default(25),
  payoutQ2: integer('payout_q2').notNull().default(25),
  payoutQ3: integer('payout_q3').notNull().default(25),
  payoutQ4: integer('payout_q4').notNull().default(25),
  // Randomly decided at lock: which team labels the rows (the other labels cols).
  homeIsRows: boolean('home_is_rows'),
  // Signup closed (no new joins).
  signupLocked: boolean('signup_locked').notNull().default(false),
  signupLockedAt: timestamp('signup_locked_at'),
  // Signup closed + grid generated.
  isLocked: boolean('is_locked').notNull().default(false),
  lockedAt: timestamp('locked_at'),
  // Randomized 0-9 digit headers, generated at lock. JSON number[10], null until then.
  rowDigits: text('row_digits'),
  colDigits: text('col_digits'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const squareAssignments = pgTable(
  'square_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    row: integer('row').notNull(), // 0-9 grid position (not digit)
    col: integer('col').notNull(), // 0-9 grid position (not digit)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.leagueId, t.row, t.col)]
);

export const quarterResults = pgTable(
  'quarter_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    quarter: integer('quarter').notNull(), // 1-4
    homeScore: integer('home_score').notNull(), // cumulative at end of quarter
    awayScore: integer('away_score').notNull(),
    winningRow: integer('winning_row'),
    winningCol: integer('winning_col'),
    winnerUserId: text('winner_user_id').references(() => users.id, { onDelete: 'set null' }),
    source: text('source').$type<'auto' | 'manual'>().notNull().default('auto'),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.leagueId, t.quarter)]
);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type LeagueMember = typeof leagueMembers.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Pick = typeof picks.$inferSelect;
export type WeekConfig = typeof weekConfig.$inferSelect;
export type PaymentStatus = typeof paymentStatus.$inferSelect;
export type SquaresConfig = typeof squaresConfig.$inferSelect;
export type SquareAssignment = typeof squareAssignments.$inferSelect;
export type QuarterResult = typeof quarterResults.$inferSelect;
export type Message = typeof messages.$inferSelect;
