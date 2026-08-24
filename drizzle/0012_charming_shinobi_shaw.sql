CREATE TABLE `erp_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`assetMasterId` int NOT NULL,
	`assetTag` varchar(96) NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` varchar(96),
	`inServiceDate` varchar(10),
	`status` enum('draft','in_service','maintenance','retired') NOT NULL DEFAULT 'draft',
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_asset_venture_tag_unique` UNIQUE(`ventureId`,`assetTag`),
	CONSTRAINT `erp_asset_venture_master_unique` UNIQUE(`ventureId`,`assetMasterId`)
);
--> statement-breakpoint
CREATE TABLE `erp_maintenance_work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`assetId` int NOT NULL,
	`workOrderNumber` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`maintenanceType` enum('preventive','corrective','inspection') NOT NULL,
	`scheduledFor` varchar(10),
	`status` enum('draft','scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
	`completionNotes` text,
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_maintenance_work_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_maintenance_venture_number_unique` UNIQUE(`ventureId`,`workOrderNumber`)
);
--> statement-breakpoint
CREATE TABLE `erp_project_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`projectId` int NOT NULL,
	`taskCode` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`assigneeUserId` int,
	`dueDate` varchar(10),
	`priority` enum('low','normal','high','critical') NOT NULL DEFAULT 'normal',
	`status` enum('draft','ready','in_progress','blocked','completed','cancelled') NOT NULL DEFAULT 'draft',
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_project_tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_task_venture_code_unique` UNIQUE(`ventureId`,`taskCode`)
);
--> statement-breakpoint
CREATE TABLE `erp_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`projectMasterId` int NOT NULL,
	`projectCode` varchar(96) NOT NULL,
	`name` varchar(180) NOT NULL,
	`ownerUserId` int,
	`startDate` varchar(10) NOT NULL,
	`targetDate` varchar(10),
	`status` enum('draft','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'draft',
	`attributes` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_project_venture_code_unique` UNIQUE(`ventureId`,`projectCode`),
	CONSTRAINT `erp_project_venture_master_unique` UNIQUE(`ventureId`,`projectMasterId`)
);
--> statement-breakpoint
ALTER TABLE `erp_assets` ADD CONSTRAINT `erp_assets_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_assets` ADD CONSTRAINT `erp_assets_assetMasterId_erp_master_records_id_fk` FOREIGN KEY (`assetMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_assets` ADD CONSTRAINT `erp_assets_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_maintenance_work_orders` ADD CONSTRAINT `erp_maintenance_work_orders_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_maintenance_work_orders` ADD CONSTRAINT `erp_maintenance_work_orders_assetId_erp_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `erp_assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_maintenance_work_orders` ADD CONSTRAINT `erp_maintenance_work_orders_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_project_tasks` ADD CONSTRAINT `erp_project_tasks_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_project_tasks` ADD CONSTRAINT `erp_project_tasks_projectId_erp_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `erp_projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_project_tasks` ADD CONSTRAINT `erp_project_tasks_assigneeUserId_users_id_fk` FOREIGN KEY (`assigneeUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_project_tasks` ADD CONSTRAINT `erp_project_tasks_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_projects` ADD CONSTRAINT `erp_projects_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_projects` ADD CONSTRAINT `erp_projects_projectMasterId_erp_master_records_id_fk` FOREIGN KEY (`projectMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_projects` ADD CONSTRAINT `erp_projects_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_projects` ADD CONSTRAINT `erp_projects_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_asset_venture_status_idx` ON `erp_assets` (`ventureId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_maintenance_asset_status_idx` ON `erp_maintenance_work_orders` (`assetId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_task_project_status_idx` ON `erp_project_tasks` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `erp_project_venture_status_idx` ON `erp_projects` (`ventureId`,`status`);