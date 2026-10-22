import { z } from 'zod';

// Browser-safe protocol. Do not import a database, runtime config, or cookie code here.
export const conversationLimits = {
  turns: 12,
  questionCharacters: 600,
  paragraphs: 8,
  paragraphCharacters: 2000,
  experienceIds: 12,
  experienceIdCharacters: 100,
  bodyBytes: 256 * 1024,
} as const;

const nonblank = (limit: number) => z.string().min(1).max(limit).refine(value => value.trim().length > 0);
export const conversationTurnSchema = z.object({
  question: nonblank(conversationLimits.questionCharacters),
  paragraphs: z.array(nonblank(conversationLimits.paragraphCharacters)).min(1).max(conversationLimits.paragraphs),
  experienceIds: z.array(z.string().min(1).max(conversationLimits.experienceIdCharacters).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/)).max(conversationLimits.experienceIds),
}).strict();

// Normalize UUID spelling so a UUID cannot select separate rows by letter case.
const archiveIdSchema = z.string().uuid().transform(value => value.toLowerCase());
export const archiveReceiptSchema = z.object({
  revision: z.number().int().positive().safe(),
}).strict();
export const archivePutSchema = z.object({
  id: archiveIdSchema,
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1),
  turns: z.array(conversationTurnSchema).min(1).max(conversationLimits.turns),
}).strict();
export const conversationErrorSchema = z.object({
  error: z.enum(['invalid_request', 'body_too_large', 'forbidden', 'unsupported_media_type', 'method_not_allowed', 'conflict', 'rate_limited', 'unavailable']),
  message: z.string(),
}).strict();

export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
export type ArchivePut = z.infer<typeof archivePutSchema>;
export type ArchiveReceipt = z.infer<typeof archiveReceiptSchema>;
