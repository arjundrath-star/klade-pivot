ALTER TABLE `students` ADD `session_days` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `session_time` text DEFAULT '17:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `pronoun` text DEFAULT 'they' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `favorites` text DEFAULT '{}' NOT NULL;