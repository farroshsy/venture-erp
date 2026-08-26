CREATE TABLE `erp_account_classification_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`accountMasterId` int NOT NULL,
	`revision` int NOT NULL,
	`classificationFamily` enum('asset','liability','equity','revenue','expense','memo') NOT NULL,
	`statementSection` enum('current_assets','noncurrent_assets','current_liabilities','noncurrent_liabilities','equity','operating_revenue','other_income','operating_expense','other_expense','memo') NOT NULL,
	`normalBalance` enum('debit','credit') NOT NULL,
	`effectiveFrom` varchar(10) NOT NULL,
	`effectiveTo` varchar(10),
	`status` enum('draft','approved','superseded','retired') NOT NULL DEFAULT 'draft',
	`rationale` varchar(255) NOT NULL,
	`adrReference` varchar(96),
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_account_classification_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_account_class_revision_unique` UNIQUE(`ventureId`,`accountMasterId`,`revision`)
);
--> statement-breakpoint
ALTER TABLE `erp_account_classification_revisions` ADD CONSTRAINT `erp_account_classification_revisions_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `erp_account_classification_revisions` ADD CONSTRAINT `erp_accr_class_acct_fk` FOREIGN KEY (`accountMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `erp_account_classification_revisions` ADD CONSTRAINT `erp_accr_class_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `erp_account_classification_revisions` ADD CONSTRAINT `erp_accr_class_approver_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `erp_account_class_venture_account_status_idx` ON `erp_account_classification_revisions` (`ventureId`,`accountMasterId`,`status`);
