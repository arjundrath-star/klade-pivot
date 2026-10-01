CREATE TABLE `badges` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`key` text NOT NULL,
	`session_log_id` text NOT NULL,
	`earned_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `badges_student_key_idx` ON `badges` (`student_id`,`key`);--> statement-breakpoint
CREATE INDEX `badges_session_log_idx` ON `badges` (`session_log_id`);--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_log_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xp_events_session_kind_idx` ON `xp_events` (`session_log_id`,`kind`);--> statement-breakpoint
CREATE INDEX `xp_events_student_idx` ON `xp_events` (`student_id`);