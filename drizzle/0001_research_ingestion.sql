CREATE TABLE `source_registry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`base_url` text NOT NULL,
	`license` text NOT NULL,
	`access_policy` text NOT NULL,
	`terms_reviewed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_registry_name` ON `source_registry` (`name`);
--> statement-breakpoint
CREATE TABLE `citations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`doi` text,
	`source_record_id` text,
	`title` text NOT NULL,
	`authors_json` text NOT NULL,
	`journal` text,
	`publication_year` integer,
	`source_url` text NOT NULL,
	`license` text NOT NULL,
	`full_text_rights` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_citations_source_record` ON `citations` (`source_url`,`source_record_id`);
--> statement-breakpoint
CREATE INDEX `idx_citations_doi` ON `citations` (`doi`);
--> statement-breakpoint
CREATE TABLE `material_systems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`canonical_key` text NOT NULL,
	`component_count` integer NOT NULL,
	`components_json` text NOT NULL,
	`composition_basis` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_material_systems_canonical_key` ON `material_systems` (`canonical_key`);
--> statement-breakpoint
CREATE TABLE `evidence_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`citation_id` integer,
	`system_id` integer NOT NULL,
	`property` text NOT NULL,
	`value_json` text NOT NULL,
	`unit` text,
	`temperature_k` real,
	`pressure_pa` real,
	`uncertainty_json` text,
	`method` text NOT NULL,
	`phase_json` text,
	`extraction_method` text NOT NULL,
	`review_status` text NOT NULL,
	`reviewer` text,
	`content_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `source_registry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`citation_id`) REFERENCES `citations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`system_id`) REFERENCES `material_systems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_system_property_status` ON `evidence_records` (`system_id`,`property`,`review_status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_content_hash` ON `evidence_records` (`content_hash`);
--> statement-breakpoint
CREATE TABLE `curation_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`identifier` text NOT NULL,
	`requested_properties_json` text NOT NULL,
	`status` text NOT NULL,
	`machine_extraction_json` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `source_registry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_curation_jobs_status_created` ON `curation_jobs` (`status`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_curation_jobs_source_identifier` ON `curation_jobs` (`source_id`,`identifier`);
--> statement-breakpoint
CREATE TABLE `dataset_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dataset_id` integer NOT NULL,
	`evidence_id` integer NOT NULL,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_dataset_evidence_pair` ON `dataset_evidence` (`dataset_id`,`evidence_id`);
