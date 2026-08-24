CREATE TABLE `erp_accounting_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`code` varchar(48) NOT NULL,
	`name` varchar(120) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`status` enum('open','soft_closed','closed') NOT NULL DEFAULT 'open',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_accounting_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_period_venture_code_unique` UNIQUE(`ventureId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`domain` varchar(64) NOT NULL,
	`operationalRecordId` int,
	`eventType` varchar(96) NOT NULL,
	`actorUserId` int,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_envelopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`accountingPeriodId` int,
	`code` varchar(64) NOT NULL,
	`name` varchar(140) NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`committedAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`spentAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`ownerUserId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_budget_envelopes_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_budget_venture_code_unique` UNIQUE(`ventureId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`operationalRecordId` int NOT NULL,
	`accountMasterId` int NOT NULL,
	`entrySide` enum('debit','credit') NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`narrative` varchar(255) NOT NULL,
	`postedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_master_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`domain` enum('customer','supplier','item','employee','account','project','asset','location','compensation_component','tax_category') NOT NULL,
	`code` varchar(96) NOT NULL,
	`name` varchar(180) NOT NULL,
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_master_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_master_venture_domain_code_unique` UNIQUE(`ventureId`,`domain`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_operational_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`domain` enum('finance','sales','procurement','inventory','people','payroll','projects','assets','service','crm') NOT NULL,
	`recordType` varchar(64) NOT NULL,
	`recordNumber` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`status` enum('draft','pending_approval','approved','posted','fulfilled','closed','cancelled','on_hold') NOT NULL DEFAULT 'draft',
	`counterpartyMasterId` int,
	`accountingPeriodId` int,
	`budgetEnvelopeId` int,
	`taxPolicyId` int,
	`amount` decimal(18,2) NOT NULL DEFAULT '0',
	`taxAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(18,2) NOT NULL DEFAULT '0',
	`effectiveDate` varchar(10) NOT NULL,
	`dueDate` varchar(10),
	`data` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_operational_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_operational_venture_record_unique` UNIQUE(`ventureId`,`recordNumber`)
);
--> statement-breakpoint
CREATE TABLE `erp_tax_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(140) NOT NULL,
	`category` enum('transaction','payroll') NOT NULL,
	`rateBasisPoints` int NOT NULL,
	`calculationMethod` enum('exclusive','inclusive','flat_amount') NOT NULL DEFAULT 'exclusive',
	`effectiveFrom` varchar(10) NOT NULL,
	`effectiveTo` varchar(10),
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`configuration` json NOT NULL,
	`reviewedByUserId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_tax_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_tax_policy_venture_code_unique` UNIQUE(`ventureId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_workflow_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`key` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`domain` varchar(64) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`definition` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_workflow_definitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_workflow_venture_key_version_unique` UNIQUE(`ventureId`,`key`,`version`)
);
--> statement-breakpoint
CREATE TABLE `erp_workflow_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`workflowDefinitionId` int NOT NULL,
	`operationalRecordId` int,
	`status` enum('active','approved','rejected','cancelled','completed') NOT NULL DEFAULT 'active',
	`currentNodeId` varchar(96) NOT NULL,
	`context` json NOT NULL,
	`startedByUserId` int NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_workflow_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_workflow_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`workflowInstanceId` int NOT NULL,
	`nodeId` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`assigneeUserId` int,
	`status` enum('pending','approved','rejected','completed','cancelled') NOT NULL DEFAULT 'pending',
	`dueAt` timestamp,
	`data` json NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_workflow_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_accounting_periods` ADD CONSTRAINT `erp_accounting_periods_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_periods` ADD CONSTRAINT `erp_accounting_periods_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_audit_events` ADD CONSTRAINT `erp_audit_events_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_audit_events` ADD CONSTRAINT `erp_audit_record_fk` FOREIGN KEY (`operationalRecordId`) REFERENCES `erp_operational_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_audit_events` ADD CONSTRAINT `erp_audit_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_budget_envelopes` ADD CONSTRAINT `erp_budget_envelopes_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_budget_envelopes` ADD CONSTRAINT `erp_budget_period_fk` FOREIGN KEY (`accountingPeriodId`) REFERENCES `erp_accounting_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_budget_envelopes` ADD CONSTRAINT `erp_budget_envelopes_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_budget_envelopes` ADD CONSTRAINT `erp_budget_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_ledger_entries` ADD CONSTRAINT `erp_ledger_entries_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_ledger_entries` ADD CONSTRAINT `erp_ledger_record_fk` FOREIGN KEY (`operationalRecordId`) REFERENCES `erp_operational_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_ledger_entries` ADD CONSTRAINT `erp_ledger_account_fk` FOREIGN KEY (`accountMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_master_records` ADD CONSTRAINT `erp_master_records_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_master_records` ADD CONSTRAINT `erp_master_records_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD CONSTRAINT `erp_operational_records_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD CONSTRAINT `erp_op_counterparty_fk` FOREIGN KEY (`counterpartyMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD CONSTRAINT `erp_op_period_fk` FOREIGN KEY (`accountingPeriodId`) REFERENCES `erp_accounting_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD CONSTRAINT `erp_op_budget_fk` FOREIGN KEY (`budgetEnvelopeId`) REFERENCES `erp_budget_envelopes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD CONSTRAINT `erp_op_tax_fk` FOREIGN KEY (`taxPolicyId`) REFERENCES `erp_tax_policies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD CONSTRAINT `erp_op_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_operational_records` ADD CONSTRAINT `erp_op_approver_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_tax_policies` ADD CONSTRAINT `erp_tax_policies_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_tax_policies` ADD CONSTRAINT `erp_tax_policies_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_tax_policies` ADD CONSTRAINT `erp_tax_policies_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_definitions` ADD CONSTRAINT `erp_workflow_definitions_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_definitions` ADD CONSTRAINT `erp_wf_definition_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_instances` ADD CONSTRAINT `erp_workflow_instances_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_instances` ADD CONSTRAINT `erp_wf_instance_definition_fk` FOREIGN KEY (`workflowDefinitionId`) REFERENCES `erp_workflow_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_instances` ADD CONSTRAINT `erp_wf_instance_record_fk` FOREIGN KEY (`operationalRecordId`) REFERENCES `erp_operational_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_instances` ADD CONSTRAINT `erp_workflow_instances_startedByUserId_users_id_fk` FOREIGN KEY (`startedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_tasks` ADD CONSTRAINT `erp_workflow_tasks_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_tasks` ADD CONSTRAINT `erp_wf_task_instance_fk` FOREIGN KEY (`workflowInstanceId`) REFERENCES `erp_workflow_instances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_workflow_tasks` ADD CONSTRAINT `erp_wf_task_assignee_fk` FOREIGN KEY (`assigneeUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_period_venture_status_idx` ON `erp_accounting_periods` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_audit_venture_domain_idx` ON `erp_audit_events` (`ventureId`,`domain`);--> statement-breakpoint
CREATE INDEX `erp_audit_record_idx` ON `erp_audit_events` (`operationalRecordId`);--> statement-breakpoint
CREATE INDEX `erp_budget_venture_status_idx` ON `erp_budget_envelopes` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_ledger_venture_record_idx` ON `erp_ledger_entries` (`ventureId`,`operationalRecordId`);--> statement-breakpoint
CREATE INDEX `erp_master_venture_domain_idx` ON `erp_master_records` (`ventureId`,`domain`);--> statement-breakpoint
CREATE INDEX `erp_operational_venture_domain_status_idx` ON `erp_operational_records` (`ventureId`,`domain`,`status`);--> statement-breakpoint
CREATE INDEX `erp_tax_policy_venture_status_idx` ON `erp_tax_policies` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_workflow_venture_domain_idx` ON `erp_workflow_definitions` (`ventureId`,`domain`);--> statement-breakpoint
CREATE INDEX `erp_workflow_instance_venture_status_idx` ON `erp_workflow_instances` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_workflow_task_venture_status_idx` ON `erp_workflow_tasks` (`ventureId`,`status`);
