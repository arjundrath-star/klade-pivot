ALTER TABLE `session_templates` ADD `playable` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `session_templates` SET `playable` = 1 WHERE `content_key` = 'algebra1/linear-equations/s1';
