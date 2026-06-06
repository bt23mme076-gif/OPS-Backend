ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_number" varchar(20);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedin_url" varchar(500);
