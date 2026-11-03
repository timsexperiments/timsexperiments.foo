CREATE TABLE `anonymous_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`revision` integer NOT NULL,
	`turns_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`next_write_at` integer NOT NULL,
	CONSTRAINT "anonymous_conversations_id_check" CHECK(length("anonymous_conversations"."id") = 36),
	CONSTRAINT "anonymous_conversations_owner_check" CHECK(length("anonymous_conversations"."owner_hash") = 64),
	CONSTRAINT "anonymous_conversations_revision_check" CHECK("anonymous_conversations"."revision" > 0 AND "anonymous_conversations"."revision" <= 9007199254740991),
	CONSTRAINT "anonymous_conversations_timestamps_check" CHECK("anonymous_conversations"."updated_at" >= "anonymous_conversations"."created_at" AND "anonymous_conversations"."next_write_at" >= "anonymous_conversations"."updated_at")
);

--> statement-breakpoint
CREATE INDEX `anonymous_conversations_owner_idx` ON `anonymous_conversations` (`owner_hash`);
