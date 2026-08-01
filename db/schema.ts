import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const datasets = sqliteTable(
  "datasets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    version: text("version").notNull(),
    license: text("license").notNull(),
    sourceUrl: text("source_url").notNull(),
    confidence: text("confidence", { enum: ["reference", "educational", "assessed", "licensed"] }).notNull(),
    reviewStatus: text("review_status", { enum: ["unreviewed", "in_review", "validated", "superseded"] }).notNull(),
    validMinK: real("valid_min_k"),
    validMaxK: real("valid_max_k"),
    contentHash: text("content_hash"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
  },
  (table) => [uniqueIndex("idx_datasets_code_version").on(table.code, table.version)],
);

export const elements = sqliteTable(
  "elements",
  {
    atomicNumber: integer("atomic_number").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    atomicMass: real("atomic_mass"),
    meltingPointK: real("melting_point_k"),
    densityGcm3: real("density_g_cm3"),
    datasetId: integer("dataset_id").references(() => datasets.id),
  },
  (table) => [uniqueIndex("idx_elements_symbol").on(table.symbol)],
);

export const materialPresets = sqliteTable(
  "material_presets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    family: text("family").notNull(),
    system: text("system").notNull(),
    compositionJson: text("composition_json").notNull(),
    sourceStandard: text("source_standard"),
    datasetId: integer("dataset_id").references(() => datasets.id),
  },
  (table) => [index("idx_material_presets_family_name").on(table.family, table.name)],
);

export const calculationRuns = sqliteTable(
  "calculation_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    systemId: text("system_id").notNull(),
    datasetCode: text("dataset_code").notNull(),
    inputJson: text("input_json").notNull(),
    resultJson: text("result_json").notNull(),
    modelVersion: text("model_version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_calculation_runs_system_created").on(table.systemId, table.createdAt)],
);
