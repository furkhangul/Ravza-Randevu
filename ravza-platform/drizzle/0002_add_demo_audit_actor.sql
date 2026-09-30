ALTER TABLE `demo_audit_logs` ADD `actor_user_id` text DEFAULT 'system' NOT NULL;
--> statement-breakpoint
PRAGMA optimize;
