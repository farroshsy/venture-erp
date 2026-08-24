ALTER TABLE `erp_assets` ADD `calculationInputs` json NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_crm_opportunities` ADD `calculationInputs` json NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_maintenance_work_orders` ADD `calculationInputs` json NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_service_requests` ADD `calculationInputs` json NOT NULL;