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
  assert.match(html, /Phase system/);
  assert.match(html, /Independent materials engineering platform/);
  assert.match(html, /Materials engineering platform/);
  assert.match(html, /Single point/);
  assert.match(html, /Solidification/);
  assert.doesNotMatch(html, /آزمایشی|Voice brief|0 tokens|Not connected/);
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

test("keeps model scope and export guardrails explicit", async () => {
  const [page, data, schema, migration, researchMigration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_iran_thermocalc.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_research_ingestion.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /engineering screening model/);
  assert.match(page, /Normalized phase weight/);
  assert.match(page, /validate critical production decisions against qualified reference data/);
  assert.match(page, /Clear capabilities, clear model boundaries/);
  assert.match(page, /Assessed data required/);
  assert.match(page, /Cooling path sampled from high to low temperature/);
  assert.match(page, /Calculated model output/);
  assert.match(page, /Temperature-sampled cooling-path calculation/);
  assert.match(page, /safeMin = runConfig\.mode === "single-point"/);
  assert.match(page, /high-to-low temperature cooling path/);
  assert.match(page, /Multicomponent lab/);
  assert.match(page, /Working 2–6 component calculation engine/);
  assert.match(page, /Run calculation/);
  assert.match(page, /Physical and mechanical response/);
  assert.match(page, /Transformation response/);
  assert.match(page, /thermalExpansionMicrostrainK/);
  assert.match(page, /runLocalMulticomponentStudy/);
  assert.doesNotMatch(page, /Scientific engine<\/small><strong>Not connected/);
  assert.doesNotMatch(page, /Input valid · scientific execution blocked/);
  assert.match(page, /Candidate · human review required/);
  assert.match(page, /Automation proposes; reviewers approve/);
  assert.doesNotMatch(page, /فارسی \(آزمایشی\)|Voice brief|Captured requirement|0 tokens/);
  assert.match(data, /Phase model produced an invalid phase weight/);
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
