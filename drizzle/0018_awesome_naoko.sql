CREATE TABLE `erp_finance_dimension_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(140) NOT NULL,
	`description` varchar(255),
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`requiredForProposal` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_finance_dimension_definitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_finance_dimension_venture_code_unique` UNIQUE(`ventureId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_finance_dimension_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`dimensionDefinitionId` int NOT NULL,
	`code` varchar(96) NOT NULL,
	`name` varchar(140) NOT NULL,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_finance_dimension_values_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_finance_dimension_value_unique` UNIQUE(`ventureId`,`dimensionDefinitionId`,`code`)
);
--> statement-breakpoint
ALTER TABLE `erp_finance_dimension_definitions` ADD CONSTRAINT `fdd_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_finance_dimension_definitions` ADD CONSTRAINT `fdd_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_finance_dimension_values` ADD CONSTRAINT `fdv_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_finance_dimension_values` ADD CONSTRAINT `fdv_definition_fk` FOREIGN KEY (`dimensionDefinitionId`) REFERENCES `erp_finance_dimension_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_finance_dimension_values` ADD CONSTRAINT `fdv_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_finance_dimension_venture_status_idx` ON `erp_finance_dimension_definitions` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_finance_dimension_value_venture_status_idx` ON `erp_finance_dimension_values` (`ventureId`,`status`);
