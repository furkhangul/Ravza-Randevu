CREATE TABLE `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe_key` text NOT NULL,
	`notification_key` text NOT NULL,
	`channel` text NOT NULL,
	`audience` text DEFAULT 'customer' NOT NULL,
	`recipient` text NOT NULL,
	`recipient_name` text DEFAULT '' NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`related_order_id` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`send_after` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_notification_outbox_dedupe` ON `notification_outbox` (`dedupe_key`,`channel`);--> statement-breakpoint
CREATE INDEX `idx_notification_outbox_due` ON `notification_outbox` (`status`,`send_after`);--> statement-breakpoint
CREATE INDEX `idx_notification_outbox_order` ON `notification_outbox` (`related_order_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`admin_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_credentials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_password_reset_token` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_admin` ON `password_reset_tokens` (`admin_id`);