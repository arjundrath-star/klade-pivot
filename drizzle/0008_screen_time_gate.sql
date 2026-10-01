CREATE TABLE `lock_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`enabled` integer NOT NULL,
	`days` text NOT NULL,
	`start_time` text DEFAULT '17:00' NOT NULL,
	`categories` text NOT NULL,
	`weekend_off` integer DEFAULT false NOT NULL,
	`override_until` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lock_rules_student_id_unique` ON `lock_rules` (`student_id`);--> statement-breakpoint
ALTER TABLE `families` ADD `demo_clock` integer;--> statement-breakpoint
CREATE INDEX `session_logs_student_completed_idx` ON `session_logs` (`student_id`,`status`,`completed_at`);