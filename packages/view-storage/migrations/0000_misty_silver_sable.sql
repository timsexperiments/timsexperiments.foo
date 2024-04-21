CREATE TABLE `timsexperiments_views` (
	`id` integer PRIMARY KEY NOT NULL,
	`page` text(256) NOT NULL,
	`ip_address` text(40) NOT NULL,
	`viewed_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ip_page_idx` ON `timsexperiments_views` (`ip_address`,`page`);--> statement-breakpoint
CREATE INDEX `page_idx` ON `timsexperiments_views` (`page`);