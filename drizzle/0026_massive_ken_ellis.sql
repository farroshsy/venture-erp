CREATE TABLE `erp_supplier_master_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`supplierMasterId` int NOT NULL,
	`counterpartyType` enum('organization','individual','public_entity','intercompany') NOT NULL,
	`procurementScope` enum('goods','services','mixed') NOT NULL,
	`identityEvidenceReference` varchar(180) NOT NULL,
	`procurementEvidenceReference` varchar(180) NOT NULL,
	`onboardingEligibility` enum('not_assessed','evidence_only_eligible','blocked') NOT NULL DEFAULT 'not_assessed',
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`activatedByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_supplier_master_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_supplier_profile_venture_master_unique` UNIQUE(`ventureId`,`supplierMasterId`)
);
--> statement-breakpoint
ALTER TABLE `erp_supplier_master_profiles` ADD CONSTRAINT `erp_supplier_profile_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_supplier_master_profiles` ADD CONSTRAINT `erp_supplier_profile_master_fk` FOREIGN KEY (`supplierMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_supplier_master_profiles` ADD CONSTRAINT `erp_supplier_profile_created_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_supplier_master_profiles` ADD CONSTRAINT `erp_supplier_profile_activated_fk` FOREIGN KEY (`activatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_supplier_profile_venture_status_idx` ON `erp_supplier_master_profiles` (`ventureId`,`status`);
