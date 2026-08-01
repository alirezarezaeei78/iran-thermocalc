CREATE TABLE `datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`license` text NOT NULL,
	`source_url` text NOT NULL,
	`confidence` text NOT NULL,
	`review_status` text NOT NULL,
	`valid_min_k` real,
	`valid_max_k` real,
	`content_hash` text,
	`published_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_datasets_code_version` ON `datasets` (`code`,`version`);
--> statement-breakpoint
CREATE TABLE `elements` (
	`atomic_number` integer PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`atomic_mass` real,
	`melting_point_k` real,
	`density_g_cm3` real,
	`dataset_id` integer,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_elements_symbol` ON `elements` (`symbol`);
--> statement-breakpoint
CREATE TABLE `material_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`family` text NOT NULL,
	`system` text NOT NULL,
	`composition_json` text NOT NULL,
	`source_standard` text,
	`dataset_id` integer,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_material_presets_family_name` ON `material_presets` (`family`,`name`);
--> statement-breakpoint
CREATE TABLE `calculation_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`system_id` text NOT NULL,
	`dataset_code` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text NOT NULL,
	`model_version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_calculation_runs_system_created` ON `calculation_runs` (`system_id`,`created_at`);
