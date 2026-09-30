CREATE TABLE `demo_agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_masked` text NOT NULL,
	`city` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_demo_audit_created` ON `demo_audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `demo_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`reference_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_demo_ledger_reference` ON `demo_ledger` (`reference_key`);--> statement-breakpoint
CREATE INDEX `idx_demo_ledger_created` ON `demo_ledger` (`created_at`);--> statement-breakpoint
CREATE TABLE `demo_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`group_code` text NOT NULL,
	`visit_window` text NOT NULL,
	`gender` text NOT NULL,
	`passenger_count` integer NOT NULL,
	`status` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_demo_orders_idempotency` ON `demo_orders` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_demo_orders_status_created` ON `demo_orders` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `demo_passengers` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_demo_passengers_status_created` ON `demo_passengers` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `demo_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_demo_tickets_status_created` ON `demo_tickets` (`status`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
