CREATE TABLE `erp_accounting_calculation_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`calculationKey` varchar(140) NOT NULL,
	`accountingEventId` int NOT NULL,
	`postingRuleRevisionId` int,
	`engineVersion` varchar(32) NOT NULL,
	`status` enum('completed','refused') NOT NULL,
	`inputHash` varchar(64) NOT NULL,
	`outputHash` varchar(64) NOT NULL,
	`previousRecordHash` varchar(64),
	`recordHash` varchar(64) NOT NULL,
	`inputSnapshot` json NOT NULL,
	`calculationSnapshot` json NOT NULL,
	`invariantSnapshot` json NOT NULL,
	`reviewStatus` enum('pending_review','reviewed','rejected') NOT NULL DEFAULT 'pending_review',
	`calculatedByUserId` int NOT NULL,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_accounting_calculation_evidence_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_calc_evidence_venture_key_unique` UNIQUE(`ventureId`,`calculationKey`)
);
--> statement-breakpoint
ALTER TABLE `erp_accounting_calculation_evidence` ADD CONSTRAINT `ace_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_calculation_evidence` ADD CONSTRAINT `ace_event_fk` FOREIGN KEY (`accountingEventId`) REFERENCES `erp_accounting_events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_calculation_evidence` ADD CONSTRAINT `ace_rule_fk` FOREIGN KEY (`postingRuleRevisionId`) REFERENCES `erp_posting_rule_revisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_calculation_evidence` ADD CONSTRAINT `ace_actor_fk` FOREIGN KEY (`calculatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_calc_evidence_venture_event_idx` ON `erp_accounting_calculation_evidence` (`ventureId`,`accountingEventId`,`calculatedAt`);
