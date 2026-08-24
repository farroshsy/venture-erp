CREATE TABLE `erp_integration_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`integrationConnectionId` int NOT NULL,
	`workflowDefinitionId` int,
	`workflowInstanceId` int,
	`operationalRecordId` int,
	`status` enum('queued','awaiting_approval','simulated','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`requestPayload` json NOT NULL,
	`responseEvidence` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_integration_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_integration_jobs` ADD CONSTRAINT `erp_intjob_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_jobs` ADD CONSTRAINT `erp_intjob_connection_fk` FOREIGN KEY (`integrationConnectionId`) REFERENCES `erp_integration_connections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_jobs` ADD CONSTRAINT `erp_intjob_wfdef_fk` FOREIGN KEY (`workflowDefinitionId`) REFERENCES `erp_workflow_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_jobs` ADD CONSTRAINT `erp_intjob_wfinst_fk` FOREIGN KEY (`workflowInstanceId`) REFERENCES `erp_workflow_instances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_jobs` ADD CONSTRAINT `erp_intjob_record_fk` FOREIGN KEY (`operationalRecordId`) REFERENCES `erp_operational_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_jobs` ADD CONSTRAINT `erp_intjob_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_int_job_venture_status_idx` ON `erp_integration_jobs` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_int_job_connection_idx` ON `erp_integration_jobs` (`integrationConnectionId`);
