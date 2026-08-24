CREATE TABLE `erp_compensation_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`code` varchar(96) NOT NULL,
	`name` varchar(180) NOT NULL,
	`kind` enum('earning','deduction') NOT NULL,
	`calculationMethod` enum('flat_amount','percentage','manual') NOT NULL,
	`defaultAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`currency` varchar(3) NOT NULL,
	`effectiveFrom` varchar(10) NOT NULL,
	`effectiveTo` varchar(10),
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`calculationInputs` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`activatedByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_compensation_components_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_comp_component_venture_code_unique` UNIQUE(`ventureId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_employee_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`employeeMasterId` int NOT NULL,
	`employeeNumber` varchar(96) NOT NULL,
	`department` varchar(120),
	`positionTitle` varchar(140) NOT NULL,
	`employmentType` enum('employee','director','contractor','temporary','apprentice','expatriate','public_servant') NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10),
	`status` enum('draft','active','on_leave','terminated') NOT NULL DEFAULT 'draft',
	`calculationInputs` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`activatedByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_employee_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_employee_profile_venture_number_unique` UNIQUE(`ventureId`,`employeeNumber`),
	CONSTRAINT `erp_employee_profile_venture_master_unique` UNIQUE(`ventureId`,`employeeMasterId`)
);
--> statement-breakpoint
ALTER TABLE `erp_compensation_components` ADD CONSTRAINT `erp_compensation_components_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_compensation_components` ADD CONSTRAINT `erp_compensation_components_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_compensation_components` ADD CONSTRAINT `erp_compensation_components_activatedByUserId_users_id_fk` FOREIGN KEY (`activatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_employee_profiles` ADD CONSTRAINT `erp_employee_profiles_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_employee_profiles` ADD CONSTRAINT `erp_employee_profiles_employeeMasterId_erp_master_records_id_fk` FOREIGN KEY (`employeeMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_employee_profiles` ADD CONSTRAINT `erp_employee_profiles_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_employee_profiles` ADD CONSTRAINT `erp_employee_profiles_activatedByUserId_users_id_fk` FOREIGN KEY (`activatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_comp_component_venture_status_idx` ON `erp_compensation_components` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_employee_profile_venture_status_idx` ON `erp_employee_profiles` (`ventureId`,`status`);