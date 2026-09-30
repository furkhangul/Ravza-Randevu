CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_agency_created` ON `audit_logs` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `creative_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`schema_json` text NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `creative_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`brief_id` text NOT NULL,
	`provider` text NOT NULL,
	`model_snapshot` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`budget_cents` integer NOT NULL,
	`status` text NOT NULL,
	`error_code` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `creative_briefs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_creative_jobs_idempotency` ON `creative_jobs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_creative_jobs_brief` ON `creative_jobs` (`brief_id`);--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`order_id` text,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`reference_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_credit_ledger_reference` ON `credit_ledger` (`reference_key`);--> statement-breakpoint
CREATE INDEX `idx_credit_ledger_agency_created` ON `credit_ledger` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`provider_transaction_id` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_orders_agency_idempotency` ON `orders` (`agency_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_orders_agency_status` ON `orders` (`agency_id`,`status`);--> statement-breakpoint
CREATE TABLE `qr_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`group_code` text NOT NULL,
	`appointment_window_start` integer NOT NULL,
	`appointment_window_end` integer NOT NULL,
	`source_timezone` text DEFAULT 'Asia/Riyadh' NOT NULL,
	`status` text NOT NULL,
	`provider_link_ref` text,
	`expires_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_qr_groups_order` ON `qr_groups` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_qr_groups_status_window` ON `qr_groups` (`status`,`appointment_window_start`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`created_by` text NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_support_agency_status` ON `support_tickets` (`agency_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_agency` ON `users` (`agency_id`);--> statement-breakpoint
PRAGMA optimize;
