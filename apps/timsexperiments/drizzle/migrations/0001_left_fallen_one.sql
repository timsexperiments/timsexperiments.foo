CREATE TABLE `experience_passages` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`story_revision` integer NOT NULL,
	`position` integer NOT NULL,
	`heading` text NOT NULL,
	`body` text NOT NULL,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `experience_stories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "experience_passages_position_check" CHECK("experience_passages"."position" >= 0),
	CONSTRAINT "experience_passages_revision_check" CHECK("experience_passages"."story_revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experience_passages_story_position_idx` ON `experience_passages` (`story_id`,`position`);--> statement-breakpoint
CREATE TABLE `experience_stories` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`dates` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`tags` text NOT NULL,
	`qualifications` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "experience_stories_status_check" CHECK("experience_stories"."status" IN ('draft', 'published')),
	CONSTRAINT "experience_stories_revision_check" CHECK("experience_stories"."revision" > 0)
);
--> statement-breakpoint
CREATE INDEX `experience_stories_status_company_idx` ON `experience_stories` (`status`,`company`);