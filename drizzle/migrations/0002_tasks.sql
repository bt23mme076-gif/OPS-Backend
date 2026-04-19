-- Run this in Supabase SQL Editor to add the tasks table
-- Supabase Dashboard → SQL Editor → New Query

DO $$ BEGIN
  CREATE TYPE "task_status" AS ENUM('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "task_priority" AS ENUM('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "task_entity_type" AS ENUM('mentor', 'student', 'general');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tasks" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title"        varchar(500) NOT NULL,
  "description"  text,
  "status"       task_status DEFAULT 'todo' NOT NULL,
  "priority"     task_priority DEFAULT 'medium' NOT NULL,
  "entity_type"  task_entity_type DEFAULT 'general' NOT NULL,
  "entity_id"    uuid,
  "assigned_to"  uuid REFERENCES "users"("id"),
  "created_by"   uuid NOT NULL REFERENCES "users"("id"),
  "due_date"     timestamp,
  "completed_at" timestamp,
  "created_at"   timestamp DEFAULT now() NOT NULL,
  "updated_at"   timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_to" ON "tasks"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_tasks_status"      ON "tasks"("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_entity"      ON "tasks"("entity_type", "entity_id");
