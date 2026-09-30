-- Nothing has written to explain_backs before this migration, so it is rebuilt rather than altered:
-- SQLite cannot add NOT NULL columns without a default.
DROP TABLE `explain_backs`;--> statement-breakpoint
CREATE TABLE `explain_backs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_log_id` text NOT NULL,
	`block` text NOT NULL,
	`problem_index` integer NOT NULL,
	`attempt` integer NOT NULL,
	`text` text NOT NULL,
	`source` text NOT NULL,
	`correctness` integer NOT NULL,
	`justification` integer NOT NULL,
	`precision` integer NOT NULL,
	`feedback` text NOT NULL,
	`verdict` text NOT NULL,
	`pasted` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`chars_per_second` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `explain_backs_attempt_idx` ON `explain_backs` (`session_log_id`,`attempt`);--> statement-breakpoint
DROP INDEX `ai_usage_session_log_id_idx`;--> statement-breakpoint
CREATE INDEX `ai_usage_session_kind_idx` ON `ai_usage` (`session_log_id`,`kind`);
