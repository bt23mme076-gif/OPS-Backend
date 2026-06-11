// One-off idempotent migration for the LinkedIn growth engine tables.
// Additive only: creates enums + linkedin_posts / linkedin_leads if absent.
// Run: node scripts/linkedin-migrate.js
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

// Read DATABASE_URL straight from .env (no extra deps).
const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/);
if (!match) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}
const connectionString = match[1].trim();

const sql = postgres(connectionString, { max: 1 });

const enums = [
  ["linkedin_post_format", ['text', 'image', 'carousel', 'video', 'poll', 'document', 'repost']],
  ["linkedin_post_status", ['idea', 'draft', 'scheduled', 'published', 'archived']],
  ["linkedin_lead_type", ['student', 'mentor', 'college_tpo', 'partner', 'investor', 'other']],
  ["linkedin_lead_stage", ['new', 'engaged', 'in_conversation', 'qualified', 'converted', 'lost']],
  ["linkedin_engagement_type", ['comment', 'reaction', 'dm', 'connection_request', 'profile_view', 'inbound']],
];

(async () => {
  try {
    for (const [name, values] of enums) {
      const labels = values.map((v) => `'${v}'`).join(', ');
      await sql.unsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
            CREATE TYPE "${name}" AS ENUM (${labels});
          END IF;
        END $$;
      `);
      console.log(`✓ enum ${name}`);
    }

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "linkedin_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "topic" varchar(120),
        "hook" text,
        "body" text,
        "format" "linkedin_post_format" NOT NULL DEFAULT 'text',
        "status" "linkedin_post_status" NOT NULL DEFAULT 'idea',
        "author_id" uuid REFERENCES "users"("id"),
        "assigned_to_id" uuid REFERENCES "users"("id"),
        "post_url" text,
        "scheduled_for" timestamp,
        "published_at" timestamp,
        "impressions" integer NOT NULL DEFAULT 0,
        "reactions" integer NOT NULL DEFAULT 0,
        "comments" integer NOT NULL DEFAULT 0,
        "reposts" integer NOT NULL DEFAULT 0,
        "profile_views" integer NOT NULL DEFAULT 0,
        "followers_gained" integer NOT NULL DEFAULT 0,
        "leads_generated" integer NOT NULL DEFAULT 0,
        "notes" text,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ table linkedin_posts');

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "linkedin_leads" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "headline" varchar(255),
        "linkedin_url" text,
        "email" varchar(255),
        "phone" varchar(20),
        "lead_type" "linkedin_lead_type" NOT NULL DEFAULT 'student',
        "stage" "linkedin_lead_stage" NOT NULL DEFAULT 'new',
        "source_post_id" uuid REFERENCES "linkedin_posts"("id"),
        "engagement_type" "linkedin_engagement_type",
        "assigned_to_id" uuid REFERENCES "users"("id"),
        "converted_to_type" "entity_type",
        "converted_to_id" uuid,
        "converted_at" timestamp,
        "notes" text,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "last_activity_at" timestamp DEFAULT now(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ table linkedin_leads');

    await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_linkedin_leads_source_post" ON "linkedin_leads" ("source_post_id");`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_linkedin_leads_stage" ON "linkedin_leads" ("stage");`);
    console.log('✓ indexes');

    console.log('\nLinkedIn migration complete.');
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    await sql.end();
    process.exit(1);
  }
})();
