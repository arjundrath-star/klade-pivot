CREATE TABLE `exit_shown` (
	`id` text PRIMARY KEY NOT NULL,
	`session_log_id` text NOT NULL,
	`problem_index` integer NOT NULL,
	`shown_at` integer NOT NULL,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exit_shown_problem_idx` ON `exit_shown` (`session_log_id`,`problem_index`);--> statement-breakpoint
CREATE TABLE `mastery` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_template_id` text NOT NULL,
	`status` text NOT NULL,
	`session_log_id` text,
	`exit_score` integer,
	`explain_back_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_template_id`) REFERENCES `session_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`explain_back_id`) REFERENCES `explain_backs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mastery_student_concept_idx` ON `mastery` (`student_id`,`session_template_id`);--> statement-breakpoint
ALTER TABLE `session_logs` ADD `outcome` text;--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_exit_once_idx` ON `attempts` (`session_log_id`,`problem_index`) WHERE "attempts"."block" = 'exit';