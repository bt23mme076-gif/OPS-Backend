-- ============================================================
-- Atyant Ops — Complete Database Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE "user_role" AS ENUM('super_admin','admin','sales','content','outreach','viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "user_status" AS ENUM('active','deactivated'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "invite_status" AS ENUM('pending','accepted','expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "mentor_stage" AS ENUM('identified','outreach_sent','call_scheduled','call_done','profile_setup','live','inactive'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "mentor_domain" AS ENUM('swe','product','data','design','finance','core_engineering','marketing','operations','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "college_tier" AS ENUM('iit_iim','nit_vnit','private_tier1','private_tier2','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "source" AS ENUM('linkedin','whatsapp','referral','cold_outreach','inbound','college','organic'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "mentor_status" AS ENUM('active','inactive','blacklisted'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "student_stage" AS ENUM('signed_up','onboarded','first_question_asked','session_booked','applied_to_role','interview_invite','placed','dropped_off'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "placement_status" AS ENUM('not_started','in_progress','placed','rejected','dropped'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "entity_type" AS ENUM('mentor','student'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "activity_type" AS ENUM('created','stage_changed','note_added','assigned','field_updated','tag_added','tag_removed','session_linked','placement_confirmed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "session_type" AS ENUM('clarity','resume_review','roadmap','interview_prep','rejection_review'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "session_format" AS ENUM('video','audio','chat'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "session_status" AS ENUM('scheduled','completed','cancelled','no_show'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "role_type" AS ENUM('internship','full_time','contract'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "role_status" AS ENUM('draft','live','closed','filled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "rejection_category" AS ENUM('skill_gap','experience_level','resume_clarity','role_mismatch','position_filled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "notification_type" AS ENUM('card_assigned','stage_changed','note_added','placement_confirmed','invite_sent','account_deactivated','session_scheduled','session_completed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── TABLES ──────────────────────────────────────────────────────────────────

-- users
CREATE TABLE IF NOT EXISTS "users" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name"          varchar(255) NOT NULL,
  "email"         varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role"          user_role DEFAULT 'viewer' NOT NULL,
  "status"        user_status DEFAULT 'active' NOT NULL,
  "avatar_url"    text,
  "invited_by"    uuid REFERENCES "users"("id"),
  "joined_at"     timestamp,
  "created_at"    timestamp DEFAULT now() NOT NULL,
  "updated_at"    timestamp DEFAULT now() NOT NULL
);

-- user_permissions
CREATE TABLE IF NOT EXISTS "user_permissions" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "module"     varchar(100) NOT NULL,
  "can_read"   boolean DEFAULT true NOT NULL,
  "can_write"  boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- invites
CREATE TABLE IF NOT EXISTS "invites" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email"       varchar(255) NOT NULL,
  "role"        user_role DEFAULT 'viewer' NOT NULL,
  "token"       text NOT NULL UNIQUE,
  "status"      invite_status DEFAULT 'pending' NOT NULL,
  "invited_by"  uuid NOT NULL REFERENCES "users"("id"),
  "expires_at"  timestamp NOT NULL,
  "accepted_at" timestamp,
  "created_at"  timestamp DEFAULT now() NOT NULL
);

-- mentors
CREATE TABLE IF NOT EXISTS "mentors" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name"           varchar(255) NOT NULL,
  "email"               varchar(255),
  "phone"               varchar(20),
  "linkedin_url"        text,
  "current_company"     varchar(255),
  "current_role"        varchar(255),
  "domain"              mentor_domain,
  "college_name"        varchar(255),
  "college_tier"        college_tier,
  "graduation_year"     integer,
  "original_branch"     varchar(255),
  "current_city"        varchar(255),
  "source"              source,
  "stage"               mentor_stage DEFAULT 'identified' NOT NULL,
  "status"              mentor_status DEFAULT 'active' NOT NULL,
  "assigned_to"         uuid REFERENCES "users"("id"),
  "created_by"          uuid NOT NULL REFERENCES "users"("id"),
  "tags"                text[] DEFAULT '{}'::text[],
  "notes"               text,
  "sessions_count"      integer DEFAULT 0 NOT NULL,
  "roles_posted_count"  integer DEFAULT 0 NOT NULL,
  "answer_cards_count"  integer DEFAULT 0 NOT NULL,
  "last_activity_at"    timestamp DEFAULT now(),
  "created_at"          timestamp DEFAULT now() NOT NULL,
  "updated_at"          timestamp DEFAULT now() NOT NULL
);

-- students
CREATE TABLE IF NOT EXISTS "students" (
  "id"                        uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name"                 varchar(255) NOT NULL,
  "email"                     varchar(255),
  "phone"                     varchar(20),
  "college_name"              varchar(255),
  "college_tier"              college_tier,
  "branch"                    varchar(255),
  "graduation_year"           integer,
  "cgpa"                      real,
  "target_role"               varchar(255),
  "target_domain"             mentor_domain,
  "source"                    source,
  "stage"                     student_stage DEFAULT 'signed_up' NOT NULL,
  "placement_status"          placement_status DEFAULT 'not_started' NOT NULL,
  "clarity_score"             integer DEFAULT 0,
  "sessions_attended"         integer DEFAULT 0 NOT NULL,
  "applications_submitted"    integer DEFAULT 0 NOT NULL,
  "interview_invites_received" integer DEFAULT 0 NOT NULL,
  "assigned_to"               uuid REFERENCES "users"("id"),
  "created_by"                uuid NOT NULL REFERENCES "users"("id"),
  "tags"                      text[] DEFAULT '{}'::text[],
  "notes"                     text,
  "last_activity_at"          timestamp DEFAULT now(),
  "created_at"                timestamp DEFAULT now() NOT NULL,
  "updated_at"                timestamp DEFAULT now() NOT NULL
);

-- pipeline_activities
CREATE TABLE IF NOT EXISTS "pipeline_activities" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type"   entity_type NOT NULL,
  "entity_id"     uuid NOT NULL,
  "activity_type" activity_type NOT NULL,
  "performed_by"  uuid NOT NULL REFERENCES "users"("id"),
  "metadata"      jsonb DEFAULT '{}'::jsonb,
  "created_at"    timestamp DEFAULT now() NOT NULL
);

-- sessions
CREATE TABLE IF NOT EXISTS "sessions" (
  "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id"                  uuid NOT NULL REFERENCES "students"("id"),
  "mentor_id"                   uuid NOT NULL REFERENCES "mentors"("id"),
  "session_type"                session_type NOT NULL,
  "format"                      session_format NOT NULL,
  "scheduled_at"                timestamp NOT NULL,
  "status"                      session_status DEFAULT 'scheduled' NOT NULL,
  "meet_link"                   text,
  "post_session_summary_filled" boolean DEFAULT false NOT NULL,
  "answer_card_generated"       boolean DEFAULT false NOT NULL,
  "student_rating"              integer,
  "outcome_rating_90_day"       integer,
  "notes"                       text,
  "created_by"                  uuid NOT NULL REFERENCES "users"("id"),
  "created_at"                  timestamp DEFAULT now() NOT NULL,
  "updated_at"                  timestamp DEFAULT now() NOT NULL
);

-- roles_posted
CREATE TABLE IF NOT EXISTS "roles_posted" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title"               varchar(255) NOT NULL,
  "company"             varchar(255) NOT NULL,
  "posted_by"           uuid NOT NULL REFERENCES "mentors"("id"),
  "role_type"           role_type NOT NULL,
  "domain"              mentor_domain,
  "min_skill_score"     integer DEFAULT 0 NOT NULL,
  "hiring_playbook"     text,
  "applications_count"  integer DEFAULT 0 NOT NULL,
  "shortlisted_count"   integer DEFAULT 0 NOT NULL,
  "placed_count"        integer DEFAULT 0 NOT NULL,
  "status"              role_status DEFAULT 'draft' NOT NULL,
  "created_by"          uuid NOT NULL REFERENCES "users"("id"),
  "created_at"          timestamp DEFAULT now() NOT NULL,
  "updated_at"          timestamp DEFAULT now() NOT NULL
);

-- applications
CREATE TABLE IF NOT EXISTS "applications" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id"              uuid NOT NULL REFERENCES "students"("id"),
  "role_id"                 uuid NOT NULL REFERENCES "roles_posted"("id"),
  "status"                  varchar(50) DEFAULT 'applied' NOT NULL,
  "is_blind_referral_queued" boolean DEFAULT false NOT NULL,
  "mentor_revealed_at"      timestamp,
  "created_at"              timestamp DEFAULT now() NOT NULL,
  "updated_at"              timestamp DEFAULT now() NOT NULL
);

-- rejection_tags
CREATE TABLE IF NOT EXISTS "rejection_tags" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "applications"("id"),
  "category"       rejection_category NOT NULL,
  "tagged_by"      uuid NOT NULL REFERENCES "users"("id"),
  "created_at"     timestamp DEFAULT now() NOT NULL
);

-- rejection_roadmaps
CREATE TABLE IF NOT EXISTS "rejection_roadmaps" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rejection_tag_id"  uuid NOT NULL REFERENCES "rejection_tags"("id"),
  "student_id"        uuid NOT NULL REFERENCES "students"("id"),
  "roadmap_content"   jsonb NOT NULL,
  "opened_at"         timestamp,
  "created_at"        timestamp DEFAULT now() NOT NULL
);

-- answer_cards
CREATE TABLE IF NOT EXISTS "answer_cards" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id"        uuid REFERENCES "sessions"("id"),
  "mentor_id"         uuid NOT NULL REFERENCES "mentors"("id"),
  "problem_statement" text NOT NULL,
  "approach_taken"    text NOT NULL,
  "steps_in_order"    jsonb NOT NULL,
  "timeline"          varchar(255),
  "mistakes_to_avoid" text,
  "is_published"      boolean DEFAULT false NOT NULL,
  "created_at"        timestamp DEFAULT now() NOT NULL,
  "updated_at"        timestamp DEFAULT now() NOT NULL
);

-- notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"       notification_type NOT NULL,
  "title"      varchar(255) NOT NULL,
  "message"    text NOT NULL,
  "metadata"   jsonb DEFAULT '{}'::jsonb,
  "is_read"    boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ─── INDEXES (performance) ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_mentors_stage"           ON "mentors"("stage");
CREATE INDEX IF NOT EXISTS "idx_mentors_assigned_to"     ON "mentors"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_mentors_created_by"      ON "mentors"("created_by");
CREATE INDEX IF NOT EXISTS "idx_students_stage"          ON "students"("stage");
CREATE INDEX IF NOT EXISTS "idx_students_assigned_to"    ON "students"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_pipeline_entity"         ON "pipeline_activities"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user"      ON "notifications"("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_sessions_student"        ON "sessions"("student_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_mentor"         ON "sessions"("mentor_id");
CREATE INDEX IF NOT EXISTS "idx_applications_student"    ON "applications"("student_id");
CREATE INDEX IF NOT EXISTS "idx_applications_role"       ON "applications"("role_id");

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- All 15 tables + 19 enums + 11 indexes created successfully.
