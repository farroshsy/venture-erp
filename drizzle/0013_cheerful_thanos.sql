CREATE TABLE `erp_crm_opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`opportunityNumber` varchar(96) NOT NULL,
	`customerMasterId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`stage` enum('draft','qualified','proposal','negotiation','won','lost','cancelled') NOT NULL DEFAULT 'draft',
	`estimatedAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`currency` varchar(3) NOT NULL,
	`targetCloseDate` varchar(10),
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_crm_opportunities_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_crm_opportunity_venture_number_unique` UNIQUE(`ventureId`,`opportunityNumber`)
);
--> statement-breakpoint
CREATE TABLE `erp_service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`requestNumber` varchar(96) NOT NULL,
	`customerMasterId` int,
	`title` varchar(180) NOT NULL,
	`severity` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`status` enum('draft','submitted','triaged','in_progress','resolved','closed','cancelled') NOT NULL DEFAULT 'draft',
	`requestedDate` varchar(10) NOT NULL,
	`resolutionNotes` text,
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_service_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_service_request_venture_number_unique` UNIQUE(`ventureId`,`requestNumber`)
);
--> statement-breakpoint
ALTER TABLE `erp_crm_opportunities` ADD CONSTRAINT `erp_crm_opportunities_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_crm_opportunities` ADD CONSTRAINT `erp_crm_opportunities_customerMasterId_erp_master_records_id_fk` FOREIGN KEY (`customerMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_crm_opportunities` ADD CONSTRAINT `erp_crm_opportunities_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_service_requests` ADD CONSTRAINT `erp_service_requests_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_service_requests` ADD CONSTRAINT `erp_service_requests_customerMasterId_erp_master_records_id_fk` FOREIGN KEY (`customerMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_service_requests` ADD CONSTRAINT `erp_service_requests_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_crm_opportunity_venture_stage_idx` ON `erp_crm_opportunities` (`ventureId`,`stage`);--> statement-breakpoint
CREATE INDEX `erp_service_request_venture_status_idx` ON `erp_service_requests` (`ventureId`,`status`);