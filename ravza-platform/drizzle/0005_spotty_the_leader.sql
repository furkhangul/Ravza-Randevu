CREATE TABLE `umrah_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`departure_city` text,
	`departure_date` text,
	`return_date` text,
	`makkah_nights` integer DEFAULT 0 NOT NULL,
	`medina_nights` integer DEFAULT 0 NOT NULL,
	`price_minor` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`included_services_json` text DEFAULT '[]' NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_umrah_packages_slug` ON `umrah_packages` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_umrah_packages_status_departure` ON `umrah_packages` (`status`,`departure_date`);
--> statement-breakpoint
PRAGMA optimize;
