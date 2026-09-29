CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`session_log_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_usage_session_log_id_idx` ON `ai_usage` (`session_log_id`);--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`student_id` text NOT NULL,
	`type` text NOT NULL,
	`delivered_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `alerts_family_id_idx` ON `alerts` (`family_id`);--> statement-breakpoint
CREATE INDEX `alerts_student_id_idx` ON `alerts` (`student_id`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_log_id` text NOT NULL,
	`block` text NOT NULL,
	`problem_index` integer NOT NULL,
	`template_key` text NOT NULL,
	`seed` integer NOT NULL,
	`answer` text NOT NULL,
	`correct` integer NOT NULL,
	`time_ms` integer NOT NULL,
	`hints_used` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attempts_student_id_idx` ON `attempts` (`student_id`);--> statement-breakpoint
CREATE INDEX `attempts_session_log_id_idx` ON `attempts` (`session_log_id`,`block`,`problem_index`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `explain_backs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_log_id` text NOT NULL,
	`text` text NOT NULL,
	`source` text NOT NULL,
	`scores` text NOT NULL,
	`verdict` text NOT NULL,
	`integrity_flags` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `explain_backs_session_log_id_idx` ON `explain_backs` (`session_log_id`);--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_template_id` text NOT NULL,
	`status` text NOT NULL,
	`seed` integer NOT NULL,
	`current_block` text DEFAULT 'warmup' NOT NULL,
	`block_started_at` integer,
	`block_elapsed_ms` text DEFAULT '{}' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_template_id`) REFERENCES `session_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_logs_student_started_idx` ON `session_logs` (`student_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `session_logs_template_id_idx` ON `session_logs` (`session_template_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_logs_one_open_idx` ON `session_logs` (`student_id`) WHERE "session_logs"."status" = 'in_progress';--> statement-breakpoint
CREATE TABLE `session_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`content_key` text NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_templates_content_key_unique` ON `session_templates` (`content_key`);--> statement-breakpoint
CREATE INDEX `session_templates_unit_id_idx` ON `session_templates` (`unit_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`target_date` text NOT NULL,
	`pace_per_week` integer NOT NULL,
	`timer_mode` text DEFAULT 'standard' NOT NULL,
	`interests` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `students_family_id_idx` ON `students` (`family_id`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `units_course_id_idx` ON `units` (`course_id`);