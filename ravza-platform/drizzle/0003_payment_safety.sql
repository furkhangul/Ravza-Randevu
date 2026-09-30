CREATE TABLE `payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`environment` text NOT NULL,
	`package_code` text NOT NULL,
	`amount_kurus` integer NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`conversation_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`provider_payment_id` text,
	`checkout_token_hash` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempts_conversation` ON `payment_attempts` (`conversation_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempts_agency_idempotency` ON `payment_attempts` (`agency_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `idx_payment_attempts_agency_status` ON `payment_attempts` (`agency_id`,`status`);
--> statement-breakpoint
CREATE TABLE `payment_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_attempt_id` text,
	`provider_event_key` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text NOT NULL,
	`payload_hash` text NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_webhook_event_key` ON `payment_webhook_events` (`provider_event_key`);
--> statement-breakpoint
CREATE INDEX `idx_payment_webhook_attempt` ON `payment_webhook_events` (`payment_attempt_id`);
--> statement-breakpoint
PRAGMA optimize;
