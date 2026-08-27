CREATE TABLE `eos_external_acquisition_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`connectionId` int NOT NULL,
	`runKey` varchar(120) NOT NULL,
	`status` enum('requested','completed','partial','failed','refused') NOT NULL,
	`requestedResources` json NOT NULL,
	`requestBoundary` json NOT NULL,
	`providerApiVersion` varchar(32) NOT NULL,
	`rateLimitSnapshot` json NOT NULL,
	`cursorSnapshot` json NOT NULL,
	`resultSnapshot` json NOT NULL,
	`failureCode` varchar(96),
	`failureDetail` varchar(255),
	`retryNotBefore` timestamp,
	`requestedByUserId` int NOT NULL,
	`requestedAt` timestamp NOT NULL,
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eos_external_acquisition_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_ext_acquisition_venture_key_unique` UNIQUE(`ventureId`,`runKey`)
);
--> statement-breakpoint
CREATE TABLE `eos_external_evidence_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`connectionId` int NOT NULL,
	`acquisitionRunId` int NOT NULL,
	`evidenceKey` varchar(160) NOT NULL,
	`resourceType` enum('repository','issue','pull_request','commit','release') NOT NULL,
	`providerObjectId` varchar(160) NOT NULL,
	`providerUrl` varchar(500) NOT NULL,
	`sourceUpdatedAt` timestamp,
	`receivedAt` timestamp NOT NULL,
	`providerApiVersion` varchar(32) NOT NULL,
	`rawPayload` json NOT NULL,
	`rawPayloadHash` varchar(64) NOT NULL,
	`sourceVersionHash` varchar(64) NOT NULL,
	`normalizedSnapshot` json NOT NULL,
	`normalizerVersion` varchar(48) NOT NULL,
	`validationPosture` enum('retained','requires_review','reviewed','rejected') NOT NULL DEFAULT 'retained',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eos_external_evidence_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_ext_evidence_venture_key_unique` UNIQUE(`ventureId`,`evidenceKey`),
	CONSTRAINT `eos_ext_evidence_source_version_unique` UNIQUE(`ventureId`,`connectionId`,`resourceType`,`providerObjectId`,`sourceVersionHash`)
);
--> statement-breakpoint
CREATE TABLE `eos_external_evidence_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`evidenceRecordId` int NOT NULL,
	`decision` enum('reviewed','rejected') NOT NULL,
	`rationale` text NOT NULL,
	`reviewedByUserId` int NOT NULL,
	`reviewedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eos_external_evidence_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_ext_evidence_review_unique` UNIQUE(`evidenceRecordId`,`decision`)
);
--> statement-breakpoint
CREATE TABLE `eos_external_source_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`connectionKey` varchar(96) NOT NULL,
	`provider` enum('github') NOT NULL,
	`status` enum('draft','validated','authorized','active','suspended','revoked') NOT NULL DEFAULT 'draft',
	`repositoryOwner` varchar(96) NOT NULL,
	`repositoryName` varchar(100) NOT NULL,
	`sourceUrl` varchar(500) NOT NULL,
	`resourceScopes` json NOT NULL,
	`dataClassification` enum('public','internal','confidential','restricted') NOT NULL,
	`credentialReference` varchar(96) NOT NULL,
	`authorizationReference` varchar(180) NOT NULL,
	`retentionPolicy` text NOT NULL,
	`deletionProcedure` text NOT NULL,
	`revocationProcedure` text NOT NULL,
	`limitations` text NOT NULL,
	`validationSnapshot` json,
	`validatedByUserId` int,
	`validatedAt` timestamp,
	`authorizedByUserId` int,
	`authorizedAt` timestamp,
	`activatedByUserId` int,
	`activatedAt` timestamp,
	`revokedByUserId` int,
	`revokedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eos_external_source_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `eos_ext_connection_venture_key_unique` UNIQUE(`ventureId`,`connectionKey`),
	CONSTRAINT `eos_ext_connection_venture_repo_unique` UNIQUE(`ventureId`,`provider`,`repositoryOwner`,`repositoryName`)
);
--> statement-breakpoint
ALTER TABLE `eos_external_acquisition_runs` ADD CONSTRAINT `eos_ext_run_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_acquisition_runs` ADD CONSTRAINT `eos_ext_run_connection_fk` FOREIGN KEY (`connectionId`) REFERENCES `eos_external_source_connections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_acquisition_runs` ADD CONSTRAINT `eos_ext_run_requester_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_evidence_records` ADD CONSTRAINT `eos_ext_evidence_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_evidence_records` ADD CONSTRAINT `eos_ext_evidence_connection_fk` FOREIGN KEY (`connectionId`) REFERENCES `eos_external_source_connections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_evidence_records` ADD CONSTRAINT `eos_ext_evidence_run_fk` FOREIGN KEY (`acquisitionRunId`) REFERENCES `eos_external_acquisition_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_evidence_reviews` ADD CONSTRAINT `eos_ext_review_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_evidence_reviews` ADD CONSTRAINT `eos_ext_review_evidence_fk` FOREIGN KEY (`evidenceRecordId`) REFERENCES `eos_external_evidence_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_evidence_reviews` ADD CONSTRAINT `eos_ext_review_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_connections` ADD CONSTRAINT `eos_ext_connection_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_connections` ADD CONSTRAINT `eos_ext_connection_validator_fk` FOREIGN KEY (`validatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_connections` ADD CONSTRAINT `eos_ext_connection_authorizer_fk` FOREIGN KEY (`authorizedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_connections` ADD CONSTRAINT `eos_ext_connection_activator_fk` FOREIGN KEY (`activatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_connections` ADD CONSTRAINT `eos_ext_connection_revoker_fk` FOREIGN KEY (`revokedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eos_external_source_connections` ADD CONSTRAINT `eos_ext_connection_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `eos_ext_acquisition_connection_status_idx` ON `eos_external_acquisition_runs` (`ventureId`,`connectionId`,`status`,`requestedAt`);--> statement-breakpoint
CREATE INDEX `eos_ext_evidence_connection_resource_idx` ON `eos_external_evidence_records` (`ventureId`,`connectionId`,`resourceType`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `eos_ext_evidence_review_venture_idx` ON `eos_external_evidence_reviews` (`ventureId`,`evidenceRecordId`,`reviewedAt`);--> statement-breakpoint
CREATE INDEX `eos_ext_connection_venture_status_idx` ON `eos_external_source_connections` (`ventureId`,`status`);
