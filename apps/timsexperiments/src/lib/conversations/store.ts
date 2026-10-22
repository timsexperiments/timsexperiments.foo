import type { Client } from '@libsql/client/web';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql/web';
import { AnonymousConversation } from '../../db/schema';
import { archivePutSchema, archiveReceiptSchema, type ArchivePut, type ArchiveReceipt } from './protocol';

export const conversationWriteIntervalMs = 2000;
type MutationResult =
  | { kind: 'saved'; receipt: ArchiveReceipt }
  | { kind: 'conflict' }
  | { kind: 'rate_limited'; retryAfter: number };

export class ConversationStore {
  private readonly db;

  constructor(client: Client, private readonly now: () => number = Date.now) {
    this.db = drizzle({ client });
  }

  async put(ownerHash: string, input: ArchivePut): Promise<MutationResult> {
    // The installed libsql client defaults to write / BEGIN IMMEDIATE. Lookup,
    // CAS and throttle therefore serialize across requests and Workers isolates.
    return this.db.transaction(async tx => {
      const now = this.now();
      const [row] = await tx.select().from(AnonymousConversation).where(and(
        eq(AnonymousConversation.id, input.id),
        eq(AnonymousConversation.ownerHash, ownerHash),
      )).limit(1);
      if (row) {
        // Stored JSON is a boundary too. Corruption fails closed without echoing it.
        const stored = archivePutSchema.parse({ id: row.id, revision: 0, turns: JSON.parse(row.turnsJson) });
        const receipt = archiveReceiptSchema.parse({ revision: row.revision });
        const identical = JSON.stringify(stored.turns) === JSON.stringify(input.turns);
        if (identical && (input.revision === row.revision || input.revision === row.revision - 1)) {
          return { kind: 'saved', receipt };
        }
        if (input.revision !== row.revision) return { kind: 'conflict' };
        if (row.nextWriteAt > now) {
          return { kind: 'rate_limited', retryAfter: Math.max(1, Math.ceil((row.nextWriteAt - now) / 1000)) };
        }
        const nextReceipt = archiveReceiptSchema.parse({ revision: row.revision + 1 });
        const changed = await tx.update(AnonymousConversation).set({
          revision: nextReceipt.revision,
          turnsJson: JSON.stringify(input.turns),
          updatedAt: now,
          nextWriteAt: now + conversationWriteIntervalMs,
        }).where(and(
          eq(AnonymousConversation.id, input.id),
          eq(AnonymousConversation.ownerHash, ownerHash),
          eq(AnonymousConversation.revision, input.revision),
        )).returning({ id: AnonymousConversation.id });
        return changed.length === 1 ? { kind: 'saved', receipt: nextReceipt } : { kind: 'conflict' };
      }
      if (input.revision !== 0) return { kind: 'conflict' };
      // An existing UUID owned by someone else must never be replaced. Report
      // the same conflict as any other failed CAS, without reading their text.
      const inserted = await tx.insert(AnonymousConversation).values({
        id: input.id,
        ownerHash,
        revision: 1,
        turnsJson: JSON.stringify(input.turns),
        createdAt: now,
        updatedAt: now,
        nextWriteAt: now + conversationWriteIntervalMs,
      }).onConflictDoNothing({ target: AnonymousConversation.id }).returning({ id: AnonymousConversation.id });
      return inserted.length === 1 ? { kind: 'saved', receipt: { revision: 1 } } : { kind: 'conflict' };
    });
  }
}
