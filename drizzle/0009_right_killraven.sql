CREATE TABLE `erp_inventory_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`itemMasterId` int NOT NULL,
	`onHandQuantity` decimal(18,3) NOT NULL DEFAULT '0',
	`reservedQuantity` decimal(18,3) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_inventory_balances_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_stock_venture_item_unique` UNIQUE(`ventureId`,`itemMasterId`)
);
--> statement-breakpoint
CREATE TABLE `erp_inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`itemMasterId` int NOT NULL,
	`operationalRecordId` int,
	`movementType` enum('receipt','issue','adjust_in','adjust_out','reserve','release') NOT NULL,
	`quantity` decimal(18,3) NOT NULL,
	`onHandAfter` decimal(18,3) NOT NULL,
	`reservedAfter` decimal(18,3) NOT NULL,
	`narrative` varchar(255) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erp_inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_inventory_balances` ADD CONSTRAINT `erp_stock_bal_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_inventory_balances` ADD CONSTRAINT `erp_stock_bal_item_fk` FOREIGN KEY (`itemMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_inventory_movements` ADD CONSTRAINT `erp_stock_move_venture_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_inventory_movements` ADD CONSTRAINT `erp_stock_move_item_fk` FOREIGN KEY (`itemMasterId`) REFERENCES `erp_master_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_inventory_movements` ADD CONSTRAINT `erp_stock_move_record_fk` FOREIGN KEY (`operationalRecordId`) REFERENCES `erp_operational_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_inventory_movements` ADD CONSTRAINT `erp_stock_move_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `erp_stock_move_venture_item_idx` ON `erp_inventory_movements` (`ventureId`,`itemMasterId`);
