ALTER TABLE `erp_budget_nodes` ADD `jurisdictionPackId` int;--> statement-breakpoint
ALTER TABLE `erp_budget_nodes` ADD CONSTRAINT `erp_budget_node_pack_fk` FOREIGN KEY (`jurisdictionPackId`) REFERENCES `erp_jurisdiction_packs`(`id`) ON DELETE no action ON UPDATE no action;
