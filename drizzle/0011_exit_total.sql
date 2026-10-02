ALTER TABLE `mastery` ADD `exit_total` integer;--> statement-breakpoint
CREATE INDEX `session_templates_playable_idx` ON `session_templates` (`playable`);