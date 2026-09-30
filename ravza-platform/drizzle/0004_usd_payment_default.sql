PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`environment` text NOT NULL,
	`package_code` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
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
INSERT INTO `__new_payment_attempts` (
	`id`, `agency_id`, `user_id`, `provider`, `environment`, `package_code`,
	`amount_minor`, `currency`, `conversation_id`, `idempotency_key`,
	`provider_payment_id`, `checkout_token_hash`, `status`, `created_at`, `updated_at`
)
SELECT
	`id`, `agency_id`, `user_id`, `provider`, `environment`, `package_code`,
	`amount_kurus`, `currency`, `conversation_id`, `idempotency_key`,
	`provider_payment_id`, `checkout_token_hash`, `status`, `created_at`, `updated_at`
FROM `payment_attempts`;
--> statement-breakpoint
DROP TABLE `payment_attempts`;
--> statement-breakpoint
ALTER TABLE `__new_payment_attempts` RENAME TO `payment_attempts`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempts_conversation` ON `payment_attempts` (`conversation_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempts_agency_idempotency` ON `payment_attempts` (`agency_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `idx_payment_attempts_agency_status` ON `payment_attempts` (`agency_id`,`status`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
PRAGMA optimize;
