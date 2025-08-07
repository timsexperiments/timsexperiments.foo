CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`subscribed` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_email_idx` ON `subscriptions` (`email`);