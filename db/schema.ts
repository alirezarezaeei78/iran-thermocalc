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

export const sourceRegistry = sqliteTable(
  "source_registry",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["experimental", "computational", "literature", "assessment"] }).notNull(),
    baseUrl: text("base_url").notNull(),
    license: text("license").notNull(),
    accessPolicy: text("access_policy").notNull(),
    termsReviewedAt: integer("terms_reviewed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("idx_source_registry_name").on(table.name)],
);

export const citations = sqliteTable(
  "citations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    doi: text("doi"),
    sourceRecordId: text("source_record_id"),
    title: text("title").notNull(),
    authorsJson: text("authors_json").notNull(),
    journal: text("journal"),
    publicationYear: integer("publication_year"),
    sourceUrl: text("source_url").notNull(),
    license: text("license").notNull(),
    fullTextRights: text("full_text_rights", { enum: ["unknown", "metadata_only", "open", "licensed"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("idx_citations_source_record").on(table.sourceUrl, table.sourceRecordId), index("idx_citations_doi").on(table.doi)],
);

export const materialSystems = sqliteTable(
  "material_systems",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    canonicalKey: text("canonical_key").notNull(),
    componentCount: integer("component_count").notNull(),
    componentsJson: text("components_json").notNull(),
    compositionBasis: text("composition_basis", { enum: ["weight_percent", "mole_fraction", "atomic_percent", "unspecified"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("idx_material_systems_canonical_key").on(table.canonicalKey)],
);

export const evidenceRecords = sqliteTable(
  "evidence_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id").notNull().references(() => sourceRegistry.id),
    citationId: integer("citation_id").references(() => citations.id),
    systemId: integer("system_id").notNull().references(() => materialSystems.id),
    property: text("property").notNull(),
    valueJson: text("value_json").notNull(),
    unit: text("unit"),
    temperatureK: real("temperature_k"),
    pressurePa: real("pressure_pa"),
    uncertaintyJson: text("uncertainty_json"),
    method: text("method").notNull(),
    phaseJson: text("phase_json"),
    extractionMethod: text("extraction_method", { enum: ["manual", "api", "ml_assisted"] }).notNull(),
    reviewStatus: text("review_status", { enum: ["candidate", "in_review", "accepted", "rejected"] }).notNull(),
    reviewer: text("reviewer"),
    contentHash: text("content_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_evidence_system_property_status").on(table.systemId, table.property, table.reviewStatus), uniqueIndex("idx_evidence_content_hash").on(table.contentHash)],
);

export const curationJobs = sqliteTable(
  "curation_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id").notNull().references(() => sourceRegistry.id),
    identifier: text("identifier").notNull(),
    requestedPropertiesJson: text("requested_properties_json").notNull(),
    status: text("status", { enum: ["queued", "extracting", "review", "complete", "failed"] }).notNull(),
    machineExtractionJson: text("machine_extraction_json"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_curation_jobs_status_created").on(table.status, table.createdAt), uniqueIndex("idx_curation_jobs_source_identifier").on(table.sourceId, table.identifier)],
);

export const datasetEvidence = sqliteTable(
  "dataset_evidence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    datasetId: integer("dataset_id").notNull().references(() => datasets.id),
    evidenceId: integer("evidence_id").notNull().references(() => evidenceRecords.id),
  },
  (table) => [uniqueIndex("idx_dataset_evidence_pair").on(table.datasetId, table.evidenceId)],
);
