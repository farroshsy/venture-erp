CREATE TABLE `erp_journal_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`journalId` int NOT NULL,
	`accountMasterId` int NOT NULL,
	`entrySide` enum('debit','credit') NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`narrative` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_journal_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_journals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`journalNumber` varchar(64) NOT NULL,
	`accountingPeriodId` int NOT NULL,
	`sourceOperationalRecordId` int,
	`currency` varchar(3) NOT NULL,
	`narrative` varchar(255) NOT NULL,
	`status` enum('draft','posted','voided') NOT NULL DEFAULT 'draft',
	`createdByUserId` int NOT NULL,
	`postedByUserId` int,
	`postedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_journals_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_journal_venture_number_unique` UNIQUE(`ventureId`,`journalNumber`)
);
--> statement-breakpoint
ALTER TABLE `erp_journal_lines` ADD CONSTRAINT `erp_jline_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_lines` ADD CONSTRAINT `erp_jline_journal_fk` FOREIGN KEY (`journalId`) REFERENCES `erp_journals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_lines` ADD CONSTRAINT `erp_jline_account_fk` FOREIGN KEY (`accountMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journals` ADD CONSTRAINT `erp_journal_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journals` ADD CONSTRAINT `erp_journal_period_fk` FOREIGN KEY (`accountingPeriodId`) REFERENCES `erp_accounting_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journals` ADD CONSTRAINT `erp_journal_record_fk` FOREIGN KEY (`sourceOperationalRecordId`) REFERENCES `erp_operational_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journals` ADD CONSTRAINT `erp_journal_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journals` ADD CONSTRAINT `erp_journal_poster_fk` FOREIGN KEY (`postedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_journal_line_venture_journal_idx` ON `erp_journal_lines` (`ventureId`,`journalId`);--> statement-breakpoint
CREATE INDEX `erp_journal_venture_status_idx` ON `erp_journals` (`ventureId`,`status`);
