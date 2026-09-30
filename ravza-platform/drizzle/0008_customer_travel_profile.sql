ALTER TABLE `customer_orders` ADD `residence_country` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_orders` ADD `residence_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_orders` ADD `departure_location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `birth_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_order_passengers` ADD `nationality` text DEFAULT '' NOT NULL;
