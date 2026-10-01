DROP TABLE `alerts`;--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`student_id` text NOT NULL,
	`type` text NOT NULL,
	`session_log_id` text NOT NULL,
	`message` text NOT NULL,
	`delivered_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `alerts_family_created_idx` ON `alerts` (`family_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_session_type_idx` ON `alerts` (`session_log_id`,`type`);--> statement-breakpoint
ALTER TABLE `session_logs` ADD `scheduled_for` text;--> statement-breakpoint
CREATE UNIQUE INDEX `session_logs_scheduled_idx` ON `session_logs` (`student_id`,`scheduled_for`) WHERE "session_logs"."scheduled_for" is not null;
