import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin',
  'sales',
  'content',
  'outreach',
  'viewer',
]);

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'expired',
]);

export const userStatusEnum = pgEnum('user_status', ['active', 'deactivated']);

export const mentorStageEnum = pgEnum('mentor_stage', [
  'identified',
  'outreach_sent',
  'call_scheduled',
  'call_done',
  'profile_setup',
  'live',
  'inactive',
]);

export const mentorDomainEnum = pgEnum('mentor_domain', [
  'swe',
  'product',
  'data',
  'design',
  'finance',
  'core_engineering',
  'marketing',
  'operations',
  'other',
]);

export const collegeTierEnum = pgEnum('college_tier', [
  'iit_iim',
  'nit_vnit',
  'private_tier1',
  'private_tier2',
  'other',
]);

export const sourceEnum = pgEnum('source', [
  'linkedin',
  'whatsapp',
  'referral',
  'cold_outreach',
  'inbound',
  'college',
  'organic',
]);

export const mentorStatusEnum = pgEnum('mentor_status', [
  'active',
  'inactive',
  'blacklisted',
]);

export const studentStageEnum = pgEnum('student_stage', [
  'signed_up',
  'onboarded',
  'first_question_asked',
  'session_booked',
  'applied_to_role',
  'interview_invite',
  'placed',
  'dropped_off',
]);

export const placementStatusEnum = pgEnum('placement_status', [
  'not_started',
  'in_progress',
  'placed',
  'rejected',
  'dropped',
]);

export const sessionTypeEnum = pgEnum('session_type', [
  'clarity',
  'resume_review',
  'roadmap',
  'interview_prep',
  'rejection_review',
]);

export const sessionFormatEnum = pgEnum('session_format', [
  'video',
  'audio',
  'chat',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
]);

export const roleTypeEnum = pgEnum('role_type', [
  'internship',
  'full_time',
  'contract',
]);

export const roleStatusEnum = pgEnum('role_status', [
  'draft',
  'live',
  'closed',
  'filled',
]);

export const rejectionCategoryEnum = pgEnum('rejection_category', [
  'skill_gap',
  'experience_level',
  'resume_clarity',
  'role_mismatch',
  'position_filled',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'card_assigned',
  'stage_changed',
  'note_added',
  'placement_confirmed',
  'invite_sent',
  'account_deactivated',
  'session_scheduled',
  'session_completed',
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'created',
  'stage_changed',
  'note_added',
  'assigned',
  'field_updated',
  'tag_added',
  'tag_removed',
  'session_linked',
  'placement_confirmed',
]);

export const entityTypeEnum = pgEnum('entity_type', ['mentor', 'student']);

// ─── USERS & AUTH ─────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  status: userStatusEnum('status').notNull().default('active'),
  avatarUrl: text('avatar_url'),
  invitedBy: uuid('invited_by').references(() => users.id),
  joinedAt: timestamp('joined_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  module: varchar('module', { length: 100 }).notNull(),
  canRead: boolean('can_read').notNull().default(true),
  canWrite: boolean('can_write').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  token: text('token').notNull().unique(),
  status: inviteStatusEnum('status').notNull().default('pending'),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  acceptedAt: timestamp('accepted_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

// ─── MENTORS ──────────────────────────────────────────────────────────────────

export const mentors = pgTable('mentors', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  linkedinUrl: text('linkedin_url'),
  currentCompany: varchar('current_company', { length: 255 }),
  currentRole: varchar('current_role', { length: 255 }),
  domain: mentorDomainEnum('domain'),
  collegeName: varchar('college_name', { length: 255 }),
  collegeTier: collegeTierEnum('college_tier'),
  graduationYear: integer('graduation_year'),
  originalBranch: varchar('original_branch', { length: 255 }),
  currentCity: varchar('current_city', { length: 255 }),
  source: sourceEnum('source'),
  stage: mentorStageEnum('stage').notNull().default('identified'),
  status: mentorStatusEnum('status').notNull().default('active'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  tags: text('tags').array().default(sql`'{}'::text[]`),
  notes: text('notes'),
  sessionsCount: integer('sessions_count').notNull().default(0),
  rolesPostedCount: integer('roles_posted_count').notNull().default(0),
  answerCardsCount: integer('answer_cards_count').notNull().default(0),
  lastActivityAt: timestamp('last_activity_at', { mode: 'string' }).defaultNow(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  collegeName: varchar('college_name', { length: 255 }),
  collegeTier: collegeTierEnum('college_tier'),
  branch: varchar('branch', { length: 255 }),
  graduationYear: integer('graduation_year'),
  cgpa: real('cgpa'),
  targetRole: varchar('target_role', { length: 255 }),
  targetDomain: mentorDomainEnum('target_domain'),
  source: sourceEnum('source'),
  stage: studentStageEnum('stage').notNull().default('signed_up'),
  placementStatus: placementStatusEnum('placement_status')
    .notNull()
    .default('not_started'),
  clarityScore: integer('clarity_score').default(0),
  sessionsAttended: integer('sessions_attended').notNull().default(0),
  applicationsSubmitted: integer('applications_submitted').notNull().default(0),
  interviewInvitesReceived: integer('interview_invites_received')
    .notNull()
    .default(0),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  tags: text('tags').array().default(sql`'{}'::text[]`),
  notes: text('notes'),
  lastActivityAt: timestamp('last_activity_at', { mode: 'string' }).defaultNow(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

// ─── PIPELINE ACTIVITY LOG ────────────────────────────────────────────────────

export const pipelineActivities = pgTable('pipeline_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  activityType: activityTypeEnum('activity_type').notNull(),
  performedBy: uuid('performed_by')
    .notNull()
    .references(() => users.id),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

// ─── SESSIONS ─────────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  mentorId: uuid('mentor_id')
    .notNull()
    .references(() => mentors.id),
  sessionType: sessionTypeEnum('session_type').notNull(),
  format: sessionFormatEnum('format').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: sessionStatusEnum('status').notNull().default('scheduled'),
  meetLink: text('meet_link'),
  postSessionSummaryFilled: boolean('post_session_summary_filled')
    .notNull()
    .default(false),
  answerCardGenerated: boolean('answer_card_generated')
    .notNull()
    .default(false),
  studentRating: integer('student_rating'),
  outcomeRating90Day: integer('outcome_rating_90_day'),
  notes: text('notes'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── ROLES / MARKETPLACE ──────────────────────────────────────────────────────

export const rolesPosted = pgTable('roles_posted', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  postedBy: uuid('posted_by')
    .notNull()
    .references(() => mentors.id),
  roleType: roleTypeEnum('role_type').notNull(),
  domain: mentorDomainEnum('domain'),
  minSkillScore: integer('min_skill_score').notNull().default(0),
  hiringPlaybook: text('hiring_playbook'),
  applicationsCount: integer('applications_count').notNull().default(0),
  shortlistedCount: integer('shortlisted_count').notNull().default(0),
  placedCount: integer('placed_count').notNull().default(0),
  status: roleStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  roleId: uuid('role_id')
    .notNull()
    .references(() => rolesPosted.id),
  status: varchar('status', { length: 50 }).notNull().default('applied'),
  isBlindReferralQueued: boolean('is_blind_referral_queued')
    .notNull()
    .default(false),
  mentorRevealedAt: timestamp('mentor_revealed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── REJECTION INTELLIGENCE ───────────────────────────────────────────────────

export const rejectionTags = pgTable('rejection_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id),
  category: rejectionCategoryEnum('category').notNull(),
  taggedBy: uuid('tagged_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rejectionRoadmaps = pgTable('rejection_roadmaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  rejectionTagId: uuid('rejection_tag_id')
    .notNull()
    .references(() => rejectionTags.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  roadmapContent: jsonb('roadmap_content').notNull(),
  openedAt: timestamp('opened_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── ANSWER CARDS ─────────────────────────────────────────────────────────────

export const answerCards = pgTable('answer_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id),
  mentorId: uuid('mentor_id')
    .notNull()
    .references(() => mentors.id),
  problemStatement: text('problem_statement').notNull(),
  approachTaken: text('approach_taken').notNull(),
  stepsInOrder: jsonb('steps_in_order').notNull(),
  timeline: varchar('timeline', { length: 255 }),
  mistakesToAvoid: text('mistakes_to_avoid'),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata').default({}),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  permissions: many(userPermissions),
  mentorsAssigned: many(mentors, { relationName: 'assignedTo' }),
  mentorsCreated: many(mentors, { relationName: 'createdBy' }),
  studentsAssigned: many(students, { relationName: 'assignedTo' }),
  studentsCreated: many(students, { relationName: 'createdBy' }),
  notifications: many(notifications),
  invitedBy: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
  }),
}));

export const mentorsRelations = relations(mentors, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [mentors.assignedTo],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  createdByUser: one(users, {
    fields: [mentors.createdBy],
    references: [users.id],
    relationName: 'createdBy',
  }),
  sessions: many(sessions),
  rolesPosted: many(rolesPosted),
  answerCards: many(answerCards),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [students.assignedTo],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  createdByUser: one(users, {
    fields: [students.createdBy],
    references: [users.id],
    relationName: 'createdBy',
  }),
  sessions: many(sessions),
  applications: many(applications),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  student: one(students, {
    fields: [sessions.studentId],
    references: [students.id],
  }),
  mentor: one(mentors, {
    fields: [sessions.mentorId],
    references: [mentors.id],
  }),
  answerCard: one(answerCards, {
    fields: [sessions.id],
    references: [answerCards.sessionId],
  }),
}));
