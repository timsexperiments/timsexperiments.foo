import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import * as z from 'zod';

export const Subscription = sqliteTable(
  'subscriptions',
  {
    id: integer('id').primaryKey(),
    name: text('name'),
    email: text('email'),
    subscribed: integer('subscribed', { mode: 'boolean' }),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default(
      sql`CURRENT_TIMESTAMP`
    ),
    updated_at: integer('updated_at', { mode: 'timestamp_ms' }).default(
      sql`CURRENT_TIMESTAMP`
    ),
  },
  (table) => [unique('unique_email_idx').on(table.email)]
);

export const SubscriptionValidator = z.object({
  name: z.string(),
  email: z.string().email(),
  subscribed: z.boolean(),
});

// The durable source records. Embeddings are derived from passages, never the
// only copy of a story. New interview material remains draft until curated.
export const ExperienceStory = sqliteTable('experience_stories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  dates: text('dates').notNull(),
  summary: text('summary').notNull(),
  body: text('body').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  qualifications: text('qualifications', { mode: 'json' }).$type<string[]>().notNull(),
  source: text('source').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  revision: integer('revision').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('experience_stories_status_company_idx').on(table.status, table.company),
  check('experience_stories_status_check', sql`${table.status} IN ('draft', 'published')`),
  check('experience_stories_revision_check', sql`${table.revision} > 0`),
]);

// Stable passages for retrieval. storyRevision lets search reject stale index
// results after a story is edited. Vector format/model are deliberately deferred.
export const ExperiencePassage = sqliteTable('experience_passages', {
  id: text('id').primaryKey(),
  storyId: text('story_id').notNull().references(() => ExperienceStory.id, { onDelete: 'cascade' }),
  storyRevision: integer('story_revision').notNull(),
  position: integer('position').notNull(),
  heading: text('heading').notNull(),
  body: text('body').notNull(),
  contentHash: text('content_hash').notNull(),
}, table => [
  unique('experience_passages_story_position_idx').on(table.storyId, table.position),
  check('experience_passages_position_check', sql`${table.position} >= 0`),
  check('experience_passages_revision_check', sql`${table.storyRevision} > 0`),
]);

// Each client-generated UUID is a separate archive. There is no visitor read,
// deletion, expiry or owner-level replacement path.
export const AnonymousConversation = sqliteTable('anonymous_conversations', {
  id: text('id').primaryKey().notNull(),
  ownerHash: text('owner_hash').notNull(),
  revision: integer('revision').notNull(),
  turnsJson: text('turns_json').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  nextWriteAt: integer('next_write_at').notNull(),
}, table => [
  index('anonymous_conversations_owner_idx').on(table.ownerHash),
  check('anonymous_conversations_id_check', sql`length(${table.id}) = 36`),
  check('anonymous_conversations_owner_check', sql`length(${table.ownerHash}) = 64`),
  check('anonymous_conversations_revision_check', sql`${table.revision} > 0 AND ${table.revision} <= 9007199254740991`),
  check('anonymous_conversations_timestamps_check', sql`${table.updatedAt} >= ${table.createdAt} AND ${table.nextWriteAt} >= ${table.updatedAt}`),
]);

export default {
  Subscription,
  ExperienceStory,
  ExperiencePassage,
  AnonymousConversation,
};
