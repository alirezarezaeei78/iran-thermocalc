import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, DB: null },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Iran ThermoCalc product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Iran ThermoCalc/);
  assert.match(html, /Illustrative phase system/);
  assert.match(html, /Independent research prototype/);
  assert.match(html, /Open-source UI prototype/);
  assert.match(html, /Single point/);
  assert.match(html, /Solidification proxy/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("removes all disposable starter-preview infrastructure", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.match(layout, /Iran ThermoCalc/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /"name": "iran-thermocalc"/);
});

test("keeps scientific scope and export guardrails explicit", async () => {
  const [page, data, schema, migration, researchMigration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_iran_thermocalc.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_research_ingestion.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /unvalidated educational prototype/);
  assert.match(page, /normalized unitless heuristic weight/);
  assert.match(page, /not validated for engineering or production decisions/);
  assert.match(page, /Useful parity, without false equivalence/);
  assert.match(page, /Solver \+ assessed data required/);
  assert.match(page, /High-to-low sampled proxy with ΔT/);
  assert.match(page, /Heuristic model output/);
  assert.match(page, /Static heuristic cooling-path proxy only/);
  assert.match(page, /safeMin = runConfig\.mode === "single-point"/);
  assert.match(page, /high-to-low temperature cooling path/);
  assert.match(page, /Multicomponent lab/);
  assert.match(page, /Working 2–6 component input contract/);
  assert.match(page, /Study definition ready/);
  assert.match(page, /This is not an input error/);
  assert.match(page, /Scientific engine/);
  assert.doesNotMatch(page, /Input valid · scientific execution blocked/);
  assert.match(page, /Candidate · human review required/);
  assert.match(page, /Machine learning proposes; reviewers promote/);
  assert.match(data, /Illustrative model produced an invalid phase weight/);
  assert.match(data, /Materials Project/);
  assert.match(data, /OQMD/);
  assert.match(data, /temperature: Number\(temperature\.toFixed\(3\)\)/);
  assert.match(schema, /reviewStatus/);
  assert.match(schema, /contentHash/);
  assert.match(schema, /evidenceRecords/);
  assert.match(schema, /extractionMethod/);
  assert.match(schema, /datasetEvidence/);
  assert.match(migration, /review_status/);
  assert.match(migration, /content_hash/);
  assert.match(researchMigration, /evidence_records/);
  assert.match(researchMigration, /ml_assisted|extraction_method/);
  assert.match(researchMigration, /dataset_evidence/);
});

test("keeps the initial workspace lightweight and local startup recoverable", async () => {
  const [page, chart, styles, server] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PhaseChart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../scripts/serve-local.mjs", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /from "recharts"/);
  assert.doesNotMatch(page, /import periodicData from/);
  assert.match(page, /import\("periodic-table\/data\.json"\)/);
  assert.match(chart, /ResizeObserver/);
  assert.match(chart, /ArrowLeft/);
  assert.match(styles, /content-visibility: auto/);
  assert.doesNotMatch(styles, /\.project-panel \{ display: none; \}/);
  assert.match(server, /EADDRINUSE/);
  assert.match(server, /PORT=3001 npm run dev/);
});
