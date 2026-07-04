CREATE TABLE "quarter_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"quarter" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"winning_row" integer,
	"winning_col" integer,
	"winner_user_id" text,
	"source" text DEFAULT 'auto' NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quarter_results_league_id_quarter_unique" UNIQUE("league_id","quarter")
);
--> statement-breakpoint
CREATE TABLE "square_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"row" integer NOT NULL,
	"col" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "square_assignments_league_id_row_col_unique" UNIQUE("league_id","row","col")
);
--> statement-breakpoint
CREATE TABLE "squares_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"espn_game_id" text NOT NULL,
	"week" integer NOT NULL,
	"season" integer NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"payout_q1" integer DEFAULT 25 NOT NULL,
	"payout_q2" integer DEFAULT 25 NOT NULL,
	"payout_q3" integer DEFAULT 25 NOT NULL,
	"payout_q4" integer DEFAULT 25 NOT NULL,
	"home_is_rows" boolean,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp,
	"row_digits" text,
	"col_digits" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "squares_config_league_id_unique" UNIQUE("league_id")
);
--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "game_type" text DEFAULT 'survivor' NOT NULL;--> statement-breakpoint
ALTER TABLE "quarter_results" ADD CONSTRAINT "quarter_results_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarter_results" ADD CONSTRAINT "quarter_results_winner_user_id_users_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "square_assignments" ADD CONSTRAINT "square_assignments_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "square_assignments" ADD CONSTRAINT "square_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squares_config" ADD CONSTRAINT "squares_config_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;