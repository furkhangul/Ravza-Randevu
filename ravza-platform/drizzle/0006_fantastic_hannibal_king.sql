CREATE TABLE `customer_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_user_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`contact_email` text NOT NULL,
	`contact_phone` text NOT NULL,
	`package_id` text NOT NULL,
	`package_name` text NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`passenger_count` integer NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`departure_city` text NOT NULL,
	`departure_date` text NOT NULL,
	`return_date` text NOT NULL,
	`ravza_visit_date` text NOT NULL,
	`ravza_selections_json` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `umrah_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_customer_orders_user_idempotency` ON `customer_orders` (`customer_user_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `idx_customer_orders_user_created` ON `customer_orders` (`customer_user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_customer_orders_status` ON `customer_orders` (`status`);
--> statement-breakpoint
CREATE TABLE `customer_order_passengers` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`gender` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `customer_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_customer_order_passengers_order` ON `customer_order_passengers` (`order_id`);
--> statement-breakpoint
PRAGMA optimize;
