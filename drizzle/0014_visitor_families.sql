ALTER TABLE `families` ADD `visitor` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `families_visitor_created_idx` ON `families` (`visitor`,`created_at`);--> statement-breakpoint
CREATE INDEX `alerts_student_id_idx` ON `alerts` (`student_id`);--> statement-breakpoint
CREATE INDEX `mastery_session_log_idx` ON `mastery` (`session_log_id`);--> statement-breakpoint
CREATE INDEX `mastery_explain_back_idx` ON `mastery` (`explain_back_id`);