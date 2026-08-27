CREATE TABLE `eos_adoption_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`studyId` int NOT NULL,
	`observationKey` varchar(96) NOT NULL,
	`status` enum('recorded','verified','rejected') NOT NULL DEFAULT 'recorded',
	`participantReference` varchar(96) NOT NULL,
	`participantIndependence` enum('declared_independent','not_independent','not_recorded') NOT NULL,
	`roleLens` enum('operator','finance_lead','approver','auditor','executive','administrator','other') NOT NULL,
	`journeyKey` enum('procurement_evidence','sales_fulfillment_evidence','payable_match','work_lifecycle','decision_lineage','audit_traceability','payroll_blocker_comprehension') NOT NULL,
	`outcome` enum('completed_unassisted','completed_with_assistance','partial','not_completed','not_started') NOT NULL,
	`taskStartedAt` timestamp,
	`taskEndedAt` timestamp,
	`durationSeconds` int,
	`assistanceCount` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	`retryCount` int NOT NULL DEFAULT 0,
	`helpUsed` int NOT NULL DEFAULT 0,
	`evidenceGapEncountered` int NOT NULL DEFAULT 0,
	`refusalOrRecovery` varchar(96),
	`participantFeedback` text,
	`facilitatorNotes` text,
	`evidenceReference` varchar(180),
	`limitations` text NOT NULL,
	`consentConfirmed` int NOT NULL DEFAULT 0,
	`occurredAt` timestamp NOT NULL,
	`createdByUserId` int NOT NULL,
	`verifiedByUserId` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eos_adoption_observations_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_adoption_observation_venture_key_unique` UNIQUE(`ventureId`,`observationKey`)
);
--> statement-breakpoint
CREATE TABLE `eos_adoption_studies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`studyKey` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`status` enum('draft','review','approved','closed','cancelled') NOT NULL DEFAULT 'draft',
	`protocolVersion` varchar(48) NOT NULL,
	`purpose` text NOT NULL,
	`journeyKeys` json NOT NULL,
	`consentNotice` text NOT NULL,
	`independencePolicy` text NOT NULL,
	`limitations` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_adoption_studies_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_adoption_study_venture_key_unique` UNIQUE(`ventureId`,`studyKey`)
);
--> statement-breakpoint
ALTER TABLE `eos_adoption_observations` ADD CONSTRAINT `eos_adoption_observations_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_adoption_observations` ADD CONSTRAINT `eos_adoption_observations_studyId_eos_adoption_studies_id_fk` FOREIGN KEY (`studyId`) REFERENCES `eos_adoption_studies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_adoption_observations` ADD CONSTRAINT `eos_adoption_observations_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_adoption_observations` ADD CONSTRAINT `eos_adoption_observations_verifiedByUserId_users_id_fk` FOREIGN KEY (`verifiedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_adoption_studies` ADD CONSTRAINT `eos_adoption_studies_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_adoption_studies` ADD CONSTRAINT `eos_adoption_studies_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_adoption_studies` ADD CONSTRAINT `eos_adoption_studies_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `eos_adoption_observation_study_status_idx` ON `eos_adoption_observations` (`ventureId`,`studyId`,`status`);--> statement-breakpoint
CREATE INDEX `eos_adoption_observation_journey_idx` ON `eos_adoption_observations` (`ventureId`,`journeyKey`,`roleLens`);--> statement-breakpoint
CREATE INDEX `eos_adoption_study_venture_status_idx` ON `eos_adoption_studies` (`ventureId`,`status`);