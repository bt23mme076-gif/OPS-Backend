DO $$ BEGIN
 CREATE TYPE "public"."linkedin_engagement_type" AS ENUM('comment', 'reaction', 'dm', 'connection_request', 'profile_view', 'inbound');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."linkedin_lead_stage" AS ENUM('new', 'engaged', 'in_conversation', 'qualified', 'converted', 'lost');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."linkedin_lead_type" AS ENUM('student', 'mentor', 'college_tpo', 'partner', 'investor', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."linkedin_post_format" AS ENUM('text', 'image', 'carousel', 'video', 'poll', 'document', 'repost');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."linkedin_post_status" AS ENUM('idea', 'draft', 'scheduled', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "squad" ADD VALUE 'CBM';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "linkedin_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"headline" varchar(255),
	"linkedin_url" text,
	"email" varchar(255),
	"phone" varchar(20),
	"lead_type" "linkedin_lead_type" DEFAULT 'student' NOT NULL,
	"stage" "linkedin_lead_stage" DEFAULT 'new' NOT NULL,
	"source_post_id" uuid,
	"engagement_type" "linkedin_engagement_type",
	"assigned_to_id" uuid,
	"converted_to_type" "entity_type",
	"converted_to_id" uuid,
	"converted_at" timestamp,
	"notes" text,
	"created_by" uuid NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "linkedin_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"topic" varchar(120),
	"hook" text,
	"body" text,
	"format" "linkedin_post_format" DEFAULT 'text' NOT NULL,
	"status" "linkedin_post_status" DEFAULT 'idea' NOT NULL,
	"author_id" uuid,
	"assigned_to_id" uuid,
	"post_url" text,
	"scheduled_for" timestamp,
	"published_at" timestamp,
	"impressions" integer DEFAULT 0 NOT NULL,
	"reactions" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"reposts" integer DEFAULT 0 NOT NULL,
	"profile_views" integer DEFAULT 0 NOT NULL,
	"followers_gained" integer DEFAULT 0 NOT NULL,
	"leads_generated" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uploaded_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"post_url" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "whatsapp_number" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_url" varchar(500);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linkedin_leads" ADD CONSTRAINT "linkedin_leads_source_post_id_linkedin_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."linkedin_posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linkedin_leads" ADD CONSTRAINT "linkedin_leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linkedin_leads" ADD CONSTRAINT "linkedin_leads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linkedin_posts" ADD CONSTRAINT "linkedin_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linkedin_posts" ADD CONSTRAINT "linkedin_posts_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linkedin_posts" ADD CONSTRAINT "linkedin_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
