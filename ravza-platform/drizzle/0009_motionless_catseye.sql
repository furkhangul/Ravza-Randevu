CREATE TABLE `admin_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`iterations` integer DEFAULT 210000 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`last_login_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admin_credentials_username` ON `admin_credentials` (`username`);--> statement-breakpoint
CREATE INDEX `idx_admin_credentials_email` ON `admin_credentials` (`email`);--> statement-breakpoint
CREATE TABLE `auth_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`given_name` text DEFAULT '' NOT NULL,
	`family_name` text DEFAULT '' NOT NULL,
	`picture_url` text DEFAULT '' NOT NULL,
	`locale` text DEFAULT '' NOT NULL,
	`last_login_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_auth_identities_provider_account` ON `auth_identities` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_identities_email` ON `auth_identities` (`email`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`provider` text NOT NULL,
	`audience` text DEFAULT 'customer' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_auth_sessions_token` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_expiry` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `customer_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`birth_date` text DEFAULT '' NOT NULL,
	`gender` text DEFAULT '' NOT NULL,
	`nationality` text DEFAULT '' NOT NULL,
	`passport_number` text DEFAULT '' NOT NULL,
	`residence_country` text DEFAULT '' NOT NULL,
	`residence_city` text DEFAULT '' NOT NULL,
	`preferred_locale` text DEFAULT 'tr' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`marketing_opt_in` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customer_profiles_email` ON `customer_profiles` (`email`);--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `birth_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `nationality` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `visa_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `visa_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `appointment_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `appointment_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `appointment_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `appointment_gate` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `qr_payload` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `rawdah_permit_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_orders` ADD `residence_country` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_orders` ADD `residence_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_orders` ADD `departure_location` text DEFAULT '' NOT NULL;