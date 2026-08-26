CREATE TABLE `erp_cost_layers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`layerKey` varchar(140) NOT NULL,
	`itemMasterId` int NOT NULL,
	`sourceInventoryMovementId` int,
	`costingPolicyRevisionId` int NOT NULL,
	`layerType` enum('receipt','issue','landed_cost') NOT NULL,
	`quantity` decimal(18,3) NOT NULL,
	`remainingQuantity` decimal(18,3) NOT NULL,
	`originalValue` decimal(18,2) NOT NULL,
	`remainingValue` decimal(18,2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`sourceSnapshot` json NOT NULL,
	`attributionSnapshot` json NOT NULL,
	`evidenceSnapshot` json NOT NULL,
	`sourceHash` varchar(64) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_cost_layers_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_cost_layer_venture_key_unique` UNIQUE(`ventureId`,`layerKey`)
);
--> statement-breakpoint
CREATE TABLE `erp_costing_calculation_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`calculationKey` varchar(140) NOT NULL,
	`calculationType` enum('valuation_preview','landed_cost_allocation','validation_report') NOT NULL,
	`costingPolicyRevisionId` int,
	`costLayerId` int,
	`accountingCalculationEvidenceId` int,
	`engineVersion` varchar(32) NOT NULL,
	`status` enum('completed','refused') NOT NULL,
	`inputHash` varchar(64) NOT NULL,
	`outputHash` varchar(64) NOT NULL,
	`previousRecordHash` varchar(64),
	`recordHash` varchar(64) NOT NULL,
	`inputSnapshot` json NOT NULL,
	`calculationSnapshot` json NOT NULL,
	`invariantSnapshot` json NOT NULL,
	`calculatedByUserId` int NOT NULL,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_costing_calculation_evidence_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_cost_calc_venture_key_unique` UNIQUE(`ventureId`,`calculationKey`)
);
--> statement-breakpoint
CREATE TABLE `erp_costing_policy_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`policyCode` varchar(96) NOT NULL,
	`policyName` varchar(160) NOT NULL,
	`costDomain` enum('inventory','manufacturing','project','service','asset','investment') NOT NULL,
	`valuationMethod` enum('fifo','lifo','moving_average','weighted_average','standard_cost','specific_identification') NOT NULL,
	`revision` int NOT NULL,
	`effectiveFrom` varchar(10) NOT NULL,
	`effectiveTo` varchar(10),
	`status` enum('draft','reviewed','approved','superseded','retired') NOT NULL DEFAULT 'draft',
	`policyConfiguration` json NOT NULL,
	`sourceRequirements` json NOT NULL,
	`rationale` varchar(255) NOT NULL,
	`adrReference` varchar(96),
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_costing_policy_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_cost_policy_venture_code_revision_unique` UNIQUE(`ventureId`,`policyCode`,`revision`)
);
--> statement-breakpoint
ALTER TABLE `erp_cost_layers` ADD CONSTRAINT `cost_layer_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_cost_layers` ADD CONSTRAINT `cost_layer_item_fk` FOREIGN KEY (`itemMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_cost_layers` ADD CONSTRAINT `cost_layer_move_fk` FOREIGN KEY (`sourceInventoryMovementId`) REFERENCES `erp_inventory_movements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_cost_layers` ADD CONSTRAINT `cost_layer_policy_fk` FOREIGN KEY (`costingPolicyRevisionId`) REFERENCES `erp_costing_policy_revisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_cost_layers` ADD CONSTRAINT `cost_layer_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_calculation_evidence` ADD CONSTRAINT `cost_calc_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_calculation_evidence` ADD CONSTRAINT `cost_calc_policy_fk` FOREIGN KEY (`costingPolicyRevisionId`) REFERENCES `erp_costing_policy_revisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_calculation_evidence` ADD CONSTRAINT `cost_calc_layer_fk` FOREIGN KEY (`costLayerId`) REFERENCES `erp_cost_layers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_calculation_evidence` ADD CONSTRAINT `cost_calc_acct_evidence_fk` FOREIGN KEY (`accountingCalculationEvidenceId`) REFERENCES `erp_accounting_calculation_evidence`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_calculation_evidence` ADD CONSTRAINT `cost_calc_user_fk` FOREIGN KEY (`calculatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_policy_revisions` ADD CONSTRAINT `cost_policy_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_policy_revisions` ADD CONSTRAINT `cost_policy_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_costing_policy_revisions` ADD CONSTRAINT `cost_policy_approver_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_cost_layer_venture_item_idx` ON `erp_cost_layers` (`ventureId`,`itemMasterId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `erp_cost_layer_venture_policy_idx` ON `erp_cost_layers` (`ventureId`,`costingPolicyRevisionId`);--> statement-breakpoint
CREATE INDEX `erp_cost_calc_venture_type_idx` ON `erp_costing_calculation_evidence` (`ventureId`,`calculationType`,`calculatedAt`);--> statement-breakpoint
CREATE INDEX `erp_cost_policy_venture_domain_status_idx` ON `erp_costing_policy_revisions` (`ventureId`,`costDomain`,`status`);
