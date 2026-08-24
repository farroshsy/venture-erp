CREATE TABLE `access_change_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int,
	`subjectUserId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`action` enum('grant','revoke','suspend') NOT NULL,
	`requestedRoleKey` varchar(96) NOT NULL,
	`scope` enum('portfolio','venture','module') NOT NULL,
	`moduleId` varchar(96),
	`status` enum('pending','approved','rejected','applied') NOT NULL DEFAULT 'pending',
	`rationale` text NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assistant_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`ventureId` int,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`evidence` json NOT NULL,
	`model` varchar(96),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistant_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_access_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`scope` enum('portfolio','venture','module') NOT NULL,
	`ventureId` int,
	`moduleId` varchar(96),
	`status` enum('active','suspended','pending_review') NOT NULL DEFAULT 'active',
	`assignedByUserId` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_access_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`name` varchar(160) NOT NULL,
	`category` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_permissions_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `platform_role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permission_unique` UNIQUE(`roleId`,`permissionId`)
);
--> statement-breakpoint
CREATE TABLE `platform_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(96) NOT NULL,
	`name` varchar(140) NOT NULL,
	`description` text NOT NULL,
	`kind` enum('system','custom') NOT NULL DEFAULT 'system',
	`status` enum('active','retired') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_roles_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `access_change_requests` ADD CONSTRAINT `access_change_requests_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `access_change_requests` ADD CONSTRAINT `access_change_requests_subjectUserId_users_id_fk` FOREIGN KEY (`subjectUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `access_change_requests` ADD CONSTRAINT `access_change_requests_requestedByUserId_users_id_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `access_change_requests` ADD CONSTRAINT `access_change_requests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assistant_messages` ADD CONSTRAINT `assistant_messages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assistant_messages` ADD CONSTRAINT `assistant_messages_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_access_assignments` ADD CONSTRAINT `platform_access_assignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_access_assignments` ADD CONSTRAINT `platform_access_assignments_roleId_platform_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `platform_roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_access_assignments` ADD CONSTRAINT `platform_access_assignments_ventureId_ventures_id_fk` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_access_assignments` ADD CONSTRAINT `platform_access_assignments_assignedByUserId_users_id_fk` FOREIGN KEY (`assignedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_role_permissions` ADD CONSTRAINT `platform_role_permissions_roleId_platform_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `platform_roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_role_permissions` ADD CONSTRAINT `prp_permission_fk` FOREIGN KEY (`permissionId`) REFERENCES `platform_permissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assistant_message_conversation_idx` ON `assistant_messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `assistant_message_user_venture_idx` ON `assistant_messages` (`userId`,`ventureId`);--> statement-breakpoint
CREATE INDEX `access_assignment_user_idx` ON `platform_access_assignments` (`userId`);--> statement-breakpoint
CREATE INDEX `access_assignment_scope_idx` ON `platform_access_assignments` (`ventureId`,`moduleId`);
