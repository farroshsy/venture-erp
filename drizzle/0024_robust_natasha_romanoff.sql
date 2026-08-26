CREATE TABLE `erp_costing_correction_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`requestKey` varchar(140) NOT NULL,
	`originalCostingCalculationEvidenceId` int NOT NULL,
	`originalCostLayerId` int,
	`originalRecordHash` varchar(64) NOT NULL,
	`originalSourceHash` varchar(64),
	`correctionEvidenceReference` varchar(180) NOT NULL,
	`rationale` varchar(255) NOT NULL,
	`readinessSnapshot` json NOT NULL,
	`requestSnapshot` json NOT NULL,
	`requestedByUserId` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_costing_correction_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_cost_corr_req_venture_key_unique` UNIQUE(`ventureId`,`requestKey`)
);
--> statement-breakpoint
CREATE TABLE `erp_costing_correction_review_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`correctionRequestId` int NOT NULL,
	`decision` enum('blocked','rejected') NOT NULL,
	`reviewNote` varchar(255) NOT NULL,
	`reasonCodes` json NOT NULL,
	`readinessSnapshot` json NOT NULL,
	`reviewSnapshot` json NOT NULL,
	`reviewedByUserId` int NOT NULL,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_costing_correction_review_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_costing_correction_requests` ADD CONSTRAINT `erp_corr_req_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_correction_requests` ADD CONSTRAINT `erp_corr_req_evidence_fk` FOREIGN KEY (`originalCostingCalculationEvidenceId`) REFERENCES `erp_costing_calculation_evidence`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_correction_requests` ADD CONSTRAINT `erp_corr_req_layer_fk` FOREIGN KEY (`originalCostLayerId`) REFERENCES `erp_cost_layers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_correction_requests` ADD CONSTRAINT `erp_corr_req_user_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_correction_review_evidence` ADD CONSTRAINT `erp_corr_review_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_correction_review_evidence` ADD CONSTRAINT `erp_corr_review_request_fk` FOREIGN KEY (`correctionRequestId`) REFERENCES `erp_costing_correction_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_correction_review_evidence` ADD CONSTRAINT `erp_corr_review_user_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_cost_corr_req_venture_evidence_idx` ON `erp_costing_correction_requests` (`ventureId`,`originalCostingCalculationEvidenceId`,`requestedAt`);--> statement-breakpoint
CREATE INDEX `erp_cost_corr_review_venture_request_idx` ON `erp_costing_correction_review_evidence` (`ventureId`,`correctionRequestId`,`reviewedAt`);
