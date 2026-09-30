CREATE TABLE `coach_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`session_log_id` text NOT NULL,
	`block` text NOT NULL,
	`problem_index` integer NOT NULL,
	`level` integer NOT NULL,
	`student_text` text NOT NULL,
	`coach_text` text NOT NULL,
	`redacted` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_turns_level_idx` ON `coach_turns` (`session_log_id`,`block`,`problem_index`,`level`);--> statement-breakpoint
ALTER TABLE `ai_usage` DROP COLUMN `cached_tokens`;
--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `cache_read_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `cache_write_tokens` integer DEFAULT 0 NOT NULL;
