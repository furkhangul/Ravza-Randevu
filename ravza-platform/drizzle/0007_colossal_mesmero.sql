ALTER TABLE `customer_orders` ADD `product_type` text DEFAULT 'umrah' NOT NULL;--> statement-breakpoint
ALTER TABLE `umrah_packages` ADD `product_type` text DEFAULT 'umrah' NOT NULL;