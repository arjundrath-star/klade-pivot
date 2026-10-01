CREATE TABLE `mentor_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`mentor_id` text NOT NULL,
	`check_in_day` text NOT NULL,
	`check_in_time` text NOT NULL,
	`last_summary` text NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mentor_id`) REFERENCES `mentors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mentor_assignments_student_id_unique` ON `mentor_assignments` (`student_id`);--> statement-breakpoint
CREATE TABLE `mentors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`school` text NOT NULL,
	`class_year` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reward_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`key` text NOT NULL,
	`current` integer NOT NULL,
	`target` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_progress_student_key_idx` ON `reward_progress` (`student_id`,`key`);--> statement-breakpoint
CREATE TABLE `reward_unlocks` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`key` text NOT NULL,
	`session_log_id` text NOT NULL,
	`unlocked_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_unlocks_student_key_idx` ON `reward_unlocks` (`student_id`,`key`);--> statement-breakpoint
CREATE INDEX `reward_unlocks_session_log_idx` ON `reward_unlocks` (`session_log_id`);