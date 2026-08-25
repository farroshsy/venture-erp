CREATE TABLE `erp_accounting_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`eventKey` varchar(96) NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`sourceDomain` varchar(64) NOT NULL,
	`sourceOperationalRecordId` int NOT NULL,
	`sourceInventoryMovementId` int,
	`accountingPeriodId` int,
	`accountingDate` varchar(10) NOT NULL,
	`transactionCurrency` varchar(3) NOT NULL,
	`functionalCurrency` varchar(3) NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`functionalAmount` decimal(18,2) NOT NULL,
	`sourceSnapshot` json NOT NULL,
	`dimensionsSnapshot` json NOT NULL,
	`evidenceSnapshot` json NOT NULL,
	`schemaVersion` int NOT NULL DEFAULT 1,
	`emittedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_accounting_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_event_venture_key_unique` UNIQUE(`ventureId`,`eventKey`),
	CONSTRAINT `erp_accounting_event_receipt_unique` UNIQUE(`ventureId`,`sourceInventoryMovementId`,`eventType`)
);
--> statement-breakpoint
CREATE TABLE `erp_journal_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`proposalNumber` varchar(96) NOT NULL,
	`accountingEventId` int NOT NULL,
	`postingRuleRevisionId` int,
	`accountingPeriodId` int,
	`status` enum('pending_review','approved','rejected','refused') NOT NULL DEFAULT 'pending_review',
	`currency` varchar(3) NOT NULL,
	`proposalSnapshot` json NOT NULL,
	`refusalReasons` json NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`reviewNote` varchar(255),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_journal_proposals_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_journal_proposal_venture_number_unique` UNIQUE(`ventureId`,`proposalNumber`),
	CONSTRAINT `erp_journal_proposal_event_rule_unique` UNIQUE(`accountingEventId`,`postingRuleRevisionId`)
);
--> statement-breakpoint
CREATE TABLE `erp_posting_rule_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`ruleCode` varchar(96) NOT NULL,
	`ruleName` varchar(160) NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`revision` int NOT NULL,
	`effectiveFrom` varchar(10) NOT NULL,
	`effectiveTo` varchar(10),
	`status` enum('draft','reviewed','approved','superseded','retired') NOT NULL DEFAULT 'draft',
	`lineConfiguration` json NOT NULL,
	`requiredDimensions` json NOT NULL,
	`changeRationale` varchar(255) NOT NULL,
	`adrReference` varchar(96),
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_posting_rule_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_posting_rule_venture_code_revision_unique` UNIQUE(`ventureId`,`ruleCode`,`revision`)
);
--> statement-breakpoint
ALTER TABLE `erp_accounting_events` ADD CONSTRAINT `ae_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_events` ADD CONSTRAINT `ae_source_record_fk` FOREIGN KEY (`sourceOperationalRecordId`) REFERENCES `erp_operational_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_events` ADD CONSTRAINT `ae_source_move_fk` FOREIGN KEY (`sourceInventoryMovementId`) REFERENCES `erp_inventory_movements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_events` ADD CONSTRAINT `ae_period_fk` FOREIGN KEY (`accountingPeriodId`) REFERENCES `erp_accounting_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_events` ADD CONSTRAINT `ae_emitter_fk` FOREIGN KEY (`emittedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_proposals` ADD CONSTRAINT `jp_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_proposals` ADD CONSTRAINT `jp_event_fk` FOREIGN KEY (`accountingEventId`) REFERENCES `erp_accounting_events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_proposals` ADD CONSTRAINT `jp_rule_revision_fk` FOREIGN KEY (`postingRuleRevisionId`) REFERENCES `erp_posting_rule_revisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_proposals` ADD CONSTRAINT `jp_period_fk` FOREIGN KEY (`accountingPeriodId`) REFERENCES `erp_accounting_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_proposals` ADD CONSTRAINT `jp_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_journal_proposals` ADD CONSTRAINT `jp_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_posting_rule_revisions` ADD CONSTRAINT `prr_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_posting_rule_revisions` ADD CONSTRAINT `prr_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_posting_rule_revisions` ADD CONSTRAINT `prr_approver_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_accounting_event_venture_type_date_idx` ON `erp_accounting_events` (`ventureId`,`eventType`,`accountingDate`);--> statement-breakpoint
CREATE INDEX `erp_journal_proposal_venture_status_idx` ON `erp_journal_proposals` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_posting_rule_venture_event_status_idx` ON `erp_posting_rule_revisions` (`ventureId`,`eventType`,`status`);
