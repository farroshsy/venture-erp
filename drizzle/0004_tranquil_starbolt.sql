CREATE TABLE `erp_budget_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`parentBudgetNodeId` int,
	`level` enum('national','state_provincial','municipal_local','agency','fund','program','project','cost_center') NOT NULL,
	`code` varchar(96) NOT NULL,
	`name` varchar(180) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`appropriatedAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`committedAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`spentAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_budget_nodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_budget_node_venture_code_unique` UNIQUE(`ventureId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_currency_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(3) NOT NULL,
	`name` varchar(96) NOT NULL,
	`symbol` varchar(12),
	`decimalPlaces` int NOT NULL DEFAULT 2,
	`status` enum('active','retired') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_currency_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_currency_profiles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`sourceCurrency` varchar(3) NOT NULL,
	`targetCurrency` varchar(3) NOT NULL,
	`rate` decimal(22,10) NOT NULL,
	`rateDate` varchar(10) NOT NULL,
	`sourceReference` varchar(255) NOT NULL,
	`status` enum('draft','approved','retired') NOT NULL DEFAULT 'draft',
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_exchange_rates_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_fx_venture_pair_date_unique` UNIQUE(`ventureId`,`sourceCurrency`,`targetCurrency`,`rateDate`)
);
--> statement-breakpoint
CREATE TABLE `erp_integration_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`adapterFamily` enum('banking','attendance','e_invoicing','pos','tax_filing','statutory_reporting','hris','procurement') NOT NULL,
	`provider` varchar(120) NOT NULL,
	`mode` enum('sandbox','production') NOT NULL DEFAULT 'sandbox',
	`endpointReference` varchar(255),
	`contractVersion` varchar(64) NOT NULL,
	`status` enum('configured','sandbox_connected','reviewed','approved','suspended','retired') NOT NULL DEFAULT 'configured',
	`healthStatus` enum('unknown','healthy','degraded','failed') NOT NULL DEFAULT 'unknown',
	`lastTestedAt` timestamp,
	`configuration` json NOT NULL,
	`ownerUserId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_integration_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_integration_venture_provider_unique` UNIQUE(`ventureId`,`adapterFamily`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `erp_jurisdiction_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(8) NOT NULL,
	`version` varchar(48) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('draft','reviewed','approved','retired') NOT NULL DEFAULT 'draft',
	`effectiveFrom` varchar(10) NOT NULL,
	`effectiveTo` varchar(10),
	`sourceLinks` json NOT NULL,
	`configuration` json NOT NULL,
	`testEvidence` json NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_jurisdiction_packs_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_pack_country_version_unique` UNIQUE(`countryCode`,`version`)
);
--> statement-breakpoint
CREATE TABLE `erp_payroll_calendars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`jurisdictionPackId` int,
	`code` varchar(64) NOT NULL,
	`name` varchar(140) NOT NULL,
	`cadence` enum('weekly','biweekly','semimonthly','monthly','ad_hoc','off_cycle') NOT NULL,
	`workerCategory` enum('employee','director','contractor','temporary','apprentice','expatriate','public_servant') NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` enum('draft','active','suspended','retired') NOT NULL DEFAULT 'draft',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_payroll_calendars_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_payroll_calendar_venture_code_unique` UNIQUE(`ventureId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_payroll_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`payrollCalendarId` int NOT NULL,
	`jurisdictionPackId` int,
	`periodStart` varchar(10) NOT NULL,
	`periodEnd` varchar(10) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` enum('draft','calculated','pending_approval','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
	`componentInput` json NOT NULL,
	`calculationEvidence` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_payroll_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_venture_jurisdiction_selections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`jurisdictionPackId` int NOT NULL,
	`purpose` enum('tax','payroll','public_budget','statutory_reporting') NOT NULL,
	`status` enum('active','suspended','retired') NOT NULL DEFAULT 'active',
	`selectedByUserId` int NOT NULL,
	`selectedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_venture_jurisdiction_selections_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_venture_pack_purpose_unique` UNIQUE(`ventureId`,`jurisdictionPackId`,`purpose`)
);
--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD `transactionCurrency` varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD `functionalCurrency` varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD `exchangeRateId` int;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD `functionalAmount` decimal(18,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_budget_nodes` ADD CONSTRAINT `erp_budget_nodes_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_budget_nodes` ADD CONSTRAINT `erp_budget_nodes_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_exchange_rates` ADD CONSTRAINT `erp_exchange_rates_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_exchange_rates` ADD CONSTRAINT `erp_exchange_rates_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_exchange_rates` ADD CONSTRAINT `erp_exchange_rates_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_connections` ADD CONSTRAINT `erp_integration_connections_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_connections` ADD CONSTRAINT `erp_integration_connections_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_integration_connections` ADD CONSTRAINT `erp_integration_connections_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_jurisdiction_packs` ADD CONSTRAINT `erp_jurisdiction_packs_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_jurisdiction_packs` ADD CONSTRAINT `erp_jurisdiction_packs_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_calendars` ADD CONSTRAINT `erp_payroll_calendars_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_calendars` ADD CONSTRAINT `erp_paycal_pack_fk` FOREIGN KEY (`jurisdictionPackId`) REFERENCES `erp_jurisdiction_packs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_calendars` ADD CONSTRAINT `erp_payroll_calendars_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_runs` ADD CONSTRAINT `erp_payroll_runs_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_runs` ADD CONSTRAINT `erp_payroll_runs_payrollCalendarId_erp_payroll_calendars_id_fk` FOREIGN KEY (`payrollCalendarId`) REFERENCES `erp_payroll_calendars`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_runs` ADD CONSTRAINT `erp_payroll_runs_jurisdictionPackId_erp_jurisdiction_packs_id_fk` FOREIGN KEY (`jurisdictionPackId`) REFERENCES `erp_jurisdiction_packs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_runs` ADD CONSTRAINT `erp_payroll_runs_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payroll_runs` ADD CONSTRAINT `erp_payroll_runs_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_venture_jurisdiction_selections` ADD CONSTRAINT `erp_venture_jurisdiction_selections_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_venture_jurisdiction_selections` ADD CONSTRAINT `erp_vpack_pack_fk` FOREIGN KEY (`jurisdictionPackId`) REFERENCES `erp_jurisdiction_packs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_venture_jurisdiction_selections` ADD CONSTRAINT `erp_venture_jurisdiction_selections_selectedByUserId_users_id_fk` FOREIGN KEY (`selectedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_budget_node_parent_idx` ON `erp_budget_nodes` (`ventureId`,`parentBudgetNodeId`);--> statement-breakpoint
CREATE INDEX `erp_fx_venture_status_idx` ON `erp_exchange_rates` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_integration_venture_status_idx` ON `erp_integration_connections` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_pack_country_status_idx` ON `erp_jurisdiction_packs` (`countryCode`,`status`);--> statement-breakpoint
CREATE INDEX `erp_payroll_calendar_venture_status_idx` ON `erp_payroll_calendars` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_payroll_run_venture_status_idx` ON `erp_payroll_runs` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_payroll_run_calendar_idx` ON `erp_payroll_runs` (`payrollCalendarId`);--> statement-breakpoint
CREATE INDEX `erp_venture_pack_active_idx` ON `erp_venture_jurisdiction_selections` (`ventureId`,`status`);
