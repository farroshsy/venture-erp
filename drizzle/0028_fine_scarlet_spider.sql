CREATE TABLE `eos_validation_benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`benchmarkKey` varchar(96) NOT NULL,
	`releaseLabel` varchar(120) NOT NULL,
	`status` enum('draft','review','approved','superseded') NOT NULL DEFAULT 'draft',
	`scoringMethodVersion` varchar(48) NOT NULL,
	`evaluatedAt` timestamp NOT NULL,
	`dimensionSnapshot` json NOT NULL,
	`evidenceSnapshot` json NOT NULL,
	`limitations` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_validation_benchmarks_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_benchmark_venture_key_unique` UNIQUE(`ventureId`,`benchmarkKey`)
);
--> statement-breakpoint
CREATE TABLE `eos_validation_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`observationKey` varchar(96) NOT NULL,
	`observationType` enum('executive_question','dashboard_review','metric_investigation','knowledge_graph_search','decision_replay','report_replacement','human_feedback','engineering_quality','source_quality','other') NOT NULL,
	`status` enum('recorded','verified','rejected') NOT NULL DEFAULT 'recorded',
	`title` varchar(180) NOT NULL,
	`outcome` enum('success','partial','unsuccessful','unknown') NOT NULL DEFAULT 'unknown',
	`measurementValue` decimal(18,4),
	`measurementUnit` varchar(48),
	`durationSeconds` int,
	`subjectType` enum('metric','graph_node','decision_memory','objective','key_result','workspace','source_contract','other') NOT NULL,
	`subjectReference` varchar(180) NOT NULL,
	`evidenceReference` varchar(180),
	`evidenceSnapshot` json NOT NULL,
	`limitations` text NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`createdByUserId` int NOT NULL,
	`verifiedByUserId` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eos_validation_observations_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_validation_observation_venture_key_unique` UNIQUE(`ventureId`,`observationKey`)
);
--> statement-breakpoint
ALTER TABLE `eos_validation_benchmarks` ADD CONSTRAINT `eos_validation_benchmarks_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_validation_benchmarks` ADD CONSTRAINT `eos_validation_benchmarks_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_validation_benchmarks` ADD CONSTRAINT `eos_validation_benchmarks_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_validation_observations` ADD CONSTRAINT `eos_validation_observations_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_validation_observations` ADD CONSTRAINT `eos_validation_observations_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_validation_observations` ADD CONSTRAINT `eos_validation_observations_verifiedByUserId_users_id_fk` FOREIGN KEY (`verifiedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `eos_benchmark_venture_status_idx` ON `eos_validation_benchmarks` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `eos_validation_observation_venture_type_idx` ON `eos_validation_observations` (`ventureId`,`observationType`,`status`);--> statement-breakpoint
CREATE INDEX `eos_validation_observation_subject_idx` ON `eos_validation_observations` (`ventureId`,`subjectType`,`subjectReference`);