CREATE TABLE `eos_decision_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`decisionKey` varchar(96) NOT NULL,
	`governanceCaseId` int,
	`title` varchar(180) NOT NULL,
	`status` enum('draft','review','approved','superseded','closed') NOT NULL DEFAULT 'draft',
	`decisionStatement` text NOT NULL,
	`alternativesSnapshot` json NOT NULL,
	`assumptionsSnapshot` json NOT NULL,
	`expectedOutcome` text NOT NULL,
	`actualOutcome` text,
	`lessonsLearned` text,
	`riskSnapshot` json NOT NULL,
	`metricKeys` json NOT NULL,
	`projectReferences` json NOT NULL,
	`reviewDueAt` timestamp,
	`decidedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_decision_memories_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_decision_memory_venture_key_unique` UNIQUE(`ventureId`,`decisionKey`)
);
--> statement-breakpoint
CREATE TABLE `eos_evidence_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`targetType` enum('objective','key_result','decision_memory','scenario','external_source_contract') NOT NULL,
	`targetId` int NOT NULL,
	`evidenceType` enum('metric','canonical_object','operational_record','workflow','audit_event','governance_decision','external_source_contract','human_assertion') NOT NULL,
	`evidenceReference` varchar(180) NOT NULL,
	`evidenceSnapshot` json NOT NULL,
	`posture` enum('retained','declared','missing','requires_review') NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eos_evidence_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eos_external_source_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`sourceKey` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`sourceCategory` enum('market','competitor','government','tender','economic','fx','interest_rate','inflation','news','hiring','patent','regulation','industry','analytics','billing','crm','observability','security') NOT NULL,
	`status` enum('draft','review','approved','unavailable','retired') NOT NULL DEFAULT 'draft',
	`collectionMode` enum('manual_evidence','approved_connector_required','api_contract_required','file_import_required') NOT NULL,
	`dataClassification` enum('public','internal','confidential','restricted') NOT NULL,
	`sourceUrl` varchar(500),
	`refreshExpectation` varchar(96) NOT NULL,
	`evidenceRequirement` text NOT NULL,
	`boundaryNote` text NOT NULL,
	`ownerUserId` int,
	`createdByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`lastVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_external_source_contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_ext_source_venture_key_unique` UNIQUE(`ventureId`,`sourceKey`)
);
--> statement-breakpoint
CREATE TABLE `eos_key_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`objectiveId` int NOT NULL,
	`resultKey` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`metricKey` varchar(160),
	`direction` enum('increase','decrease','maintain','milestone') NOT NULL,
	`targetValue` decimal(18,4),
	`targetUnit` varchar(48),
	`status` enum('draft','active','at_risk','achieved','closed','cancelled') NOT NULL DEFAULT 'draft',
	`ownerUserId` int,
	`evidenceRequirement` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_key_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_key_result_venture_key_unique` UNIQUE(`ventureId`,`resultKey`)
);
--> statement-breakpoint
CREATE TABLE `eos_scenario_preparations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`scenarioKey` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`scenarioType` enum('strategy','risk','opportunity','portfolio','operating_plan') NOT NULL,
	`status` enum('draft','review','approved','archived') NOT NULL DEFAULT 'draft',
	`question` text NOT NULL,
	`assumptionsSnapshot` json NOT NULL,
	`evidenceRequirement` text NOT NULL,
	`limitations` text NOT NULL,
	`ownerUserId` int,
	`createdByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_scenario_preparations_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_scenario_venture_key_unique` UNIQUE(`ventureId`,`scenarioKey`)
);
--> statement-breakpoint
CREATE TABLE `eos_strategic_objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`objectiveKey` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`status` enum('draft','active','paused','achieved','closed','cancelled') NOT NULL DEFAULT 'draft',
	`periodStart` varchar(10) NOT NULL,
	`periodEnd` varchar(10) NOT NULL,
	`ownerUserId` int,
	`evidenceRequirement` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_strategic_objectives_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_objective_venture_key_unique` UNIQUE(`ventureId`,`objectiveKey`)
);
--> statement-breakpoint
ALTER TABLE `eos_decision_memories` ADD CONSTRAINT `eos_decision_memories_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_decision_memories` ADD CONSTRAINT `eos_decision_memories_governanceCaseId_governance_cases_id_fk` FOREIGN KEY (`governanceCaseId`) REFERENCES `governance_cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_decision_memories` ADD CONSTRAINT `eos_decision_memories_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_decision_memories` ADD CONSTRAINT `eos_decision_memories_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_evidence_links` ADD CONSTRAINT `eos_evidence_links_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_evidence_links` ADD CONSTRAINT `eos_evidence_links_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_contracts` ADD CONSTRAINT `eos_external_source_contracts_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_contracts` ADD CONSTRAINT `eos_external_source_contracts_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_contracts` ADD CONSTRAINT `eos_external_source_contracts_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_contracts` ADD CONSTRAINT `eos_external_source_contracts_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_key_results` ADD CONSTRAINT `eos_key_results_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_key_results` ADD CONSTRAINT `eos_key_results_objectiveId_eos_strategic_objectives_id_fk` FOREIGN KEY (`objectiveId`) REFERENCES `eos_strategic_objectives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_key_results` ADD CONSTRAINT `eos_key_results_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_key_results` ADD CONSTRAINT `eos_key_results_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_scenario_preparations` ADD CONSTRAINT `eos_scenario_preparations_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_scenario_preparations` ADD CONSTRAINT `eos_scenario_preparations_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_scenario_preparations` ADD CONSTRAINT `eos_scenario_preparations_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_scenario_preparations` ADD CONSTRAINT `eos_scenario_preparations_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_strategic_objectives` ADD CONSTRAINT `eos_strategic_objectives_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_strategic_objectives` ADD CONSTRAINT `eos_strategic_objectives_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_strategic_objectives` ADD CONSTRAINT `eos_strategic_objectives_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_strategic_objectives` ADD CONSTRAINT `eos_strategic_objectives_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `eos_decision_memory_venture_status_idx` ON `eos_decision_memories` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `eos_decision_memory_governance_case_idx` ON `eos_decision_memories` (`governanceCaseId`);--> statement-breakpoint
CREATE INDEX `eos_evidence_link_venture_target_idx` ON `eos_evidence_links` (`ventureId`,`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `eos_evidence_link_reference_idx` ON `eos_evidence_links` (`ventureId`,`evidenceType`,`evidenceReference`);--> statement-breakpoint
CREATE INDEX `eos_ext_source_venture_category_idx` ON `eos_external_source_contracts` (`ventureId`,`sourceCategory`,`status`);--> statement-breakpoint
CREATE INDEX `eos_key_result_venture_objective_idx` ON `eos_key_results` (`ventureId`,`objectiveId`,`status`);--> statement-breakpoint
CREATE INDEX `eos_scenario_venture_status_idx` ON `eos_scenario_preparations` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `eos_objective_venture_status_idx` ON `eos_strategic_objectives` (`ventureId`,`status`);