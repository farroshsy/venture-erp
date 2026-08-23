CREATE TABLE `decision_evidence_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`governanceCaseId` int NOT NULL,
	`status` enum('draft','approved','superseded') NOT NULL DEFAULT 'draft',
	`model` varchar(96),
	`summary` text NOT NULL,
	`assumptions` json NOT NULL,
	`risks` json NOT NULL,
	`humanApprovalRequired` int NOT NULL DEFAULT 1,
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decision_evidence_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`capability` varchar(180) NOT NULL,
	`status` enum('draft','review','approved','rejected') NOT NULL DEFAULT 'draft',
	`recommendation` enum('sap','alternative','custom') NOT NULL,
	`criteria` json NOT NULL,
	`evidence` json NOT NULL,
	`assumptions` json NOT NULL,
	`rationale` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governance_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venture_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('portfolio_admin','venture_lead','finance_lead','operator','viewer') NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venture_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `venture_membership_user_venture_unique` UNIQUE(`ventureId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `ventures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(96) NOT NULL,
	`name` varchar(120) NOT NULL,
	`legalName` varchar(180),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`baseCurrency` varchar(3) NOT NULL DEFAULT 'USD',
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ventures_id` PRIMARY KEY(`id`),
	CONSTRAINT `ventures_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `decision_evidence_reviews` ADD CONSTRAINT `der_case_fk` FOREIGN KEY (`governanceCaseId`) REFERENCES `governance_cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decision_evidence_reviews` ADD CONSTRAINT `der_created_by_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decision_evidence_reviews` ADD CONSTRAINT `der_approved_by_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `governance_cases` ADD CONSTRAINT `gc_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `governance_cases` ADD CONSTRAINT `gc_created_by_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `governance_cases` ADD CONSTRAINT `gc_approved_by_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venture_memberships` ADD CONSTRAINT `vm_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venture_memberships` ADD CONSTRAINT `vm_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `decision_review_case_idx` ON `decision_evidence_reviews` (`governanceCaseId`);--> statement-breakpoint
CREATE INDEX `governance_case_venture_idx` ON `governance_cases` (`ventureId`);--> statement-breakpoint
CREATE INDEX `venture_membership_user_idx` ON `venture_memberships` (`userId`);
