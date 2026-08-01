"use client";

import { useEffect, useMemo, useState } from "react";
import periodicData from "periodic-table/data.json";
import {
  Atom,
  BookOpen,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  FlaskConical,
  Gauge,
  Globe2,
  Info,
  Languages,
  Layers3,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Thermometer,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { alloyPresets, calculateSystem, dataPacks, sources, systems } from "./data";

type View = "workspace" | "database" | "method";
type ResultView = "plot" | "table";
type Language = "en" | "fa";

type ElementRecord = {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: string;
  meltingPoint: number | string;
  density: number | string;
  groupBlock: string;
};

const elements = periodicData as ElementRecord[];

const copy = {
  en: {
    workspace: "Workspace",
    database: "Data library",
    method: "Method & sources",
    run: "Run calculation",
    calculating: "Calculating…",
    system: "Illustrative phase system",
    conditions: "Conditions",
    results: "Results",
    composition: "Composition",
    temperature: "Temperature range",
    pressure: "Pressure",
    plot: "Plot",
    table: "Table",
    search: "Search elements or alloys",
    projects: "Project flow",
  },
  fa: {
    workspace: "محیط محاسبه",
    database: "کتابخانه داده",
    method: "روش و منابع",
    run: "اجرای محاسبه",
    calculating: "در حال محاسبه…",
    system: "سامانه نمایشی فازها",
    conditions: "شرایط",
    results: "نتایج",
    composition: "ترکیب شیمیایی",
    temperature: "بازه دما",
    pressure: "فشار",
    plot: "نمودار",
    table: "جدول",
    search: "جستجوی عنصر یا آلیاژ",
    projects: "روند پروژه",
  },
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("workspace");
  const [language, setLanguage] = useState<Language>("en");
  const [systemId, setSystemId] = useState("fe-c");
  const [composition, setComposition] = useState(0.4);
  const [tempMin, setTempMin] = useState(400);
  const [tempMax, setTempMax] = useState(1600);
  const pressure = 1;
  const [resultView, setResultView] = useState<ResultView>("plot");
  const [isRunning, setIsRunning] = useState(false);
  const [runNumber, setRunNumber] = useState(1);
  const [runConfig, setRunConfig] = useState({
    systemId: "fe-c",
    composition: 0.4,
    tempMin: 400,
    tempMax: 1600,
    pressure: 1,
  });
  const [query, setQuery] = useState("");
  const [dataMode, setDataMode] = useState<"elements" | "alloys">("elements");
  const [selectedPackCode, setSelectedPackCode] = useState("IRFE");
  const [downloadMessage, setDownloadMessage] = useState("");

  const t = copy[language];
  const system = systems.find((item) => item.id === systemId) ?? systems[0];
  const resultSystem = systems.find((item) => item.id === runConfig.systemId) ?? systems[0];
  const selectedPack = dataPacks.find((item) => item.code === selectedPackCode) ?? dataPacks[0];
  const compositionStep = system.maxComposition === 6.67 ? 0.01 : system.maxComposition > 50 ? 1 : 0.05;
  const invalidRange = tempMax <= tempMin || tempMin < system.tempMin || tempMax > system.tempMax;
  const isDirty =
    systemId !== runConfig.systemId ||
    composition !== runConfig.composition ||
    tempMin !== runConfig.tempMin ||
    tempMax !== runConfig.tempMax ||
    pressure !== runConfig.pressure;
  const chartData = useMemo(
    () => calculateSystem(runConfig.systemId, runConfig.composition, runConfig.tempMin, runConfig.tempMax),
    [runConfig],
  );

  const filteredElements = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return elements;
    return elements.filter((element) =>
      `${element.name} ${element.symbol} ${element.atomicNumber} ${element.groupBlock}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  const filteredAlloys = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return alloyPresets;
    return alloyPresets.filter((alloy) =>
      `${alloy.name} ${alloy.family} ${alloy.system} ${alloy.use}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
  }, [language]);

  const switchSystem = (nextId: string) => {
    const next = systems.find((item) => item.id === nextId) ?? systems[0];
    setSystemId(next.id);
    setComposition(next.defaultComposition);
    setTempMin(next.tempMin);
    setTempMax(next.tempMax);
  };

  const runCalculation = () => {
    setIsRunning(true);
    window.setTimeout(() => {
      setRunConfig({ systemId, composition, tempMin, tempMax, pressure });
      setRunNumber((value) => value + 1);
      setIsRunning(false);
    }, 480);
  };

  const useAlloyInWorkspace = (alloyName: string) => {
    const mappings: Record<string, { systemId: string; composition: number }> = {
      "AISI 1040": { systemId: "fe-c", composition: 0.4 },
      "AISI 430": { systemId: "fe-cr", composition: 16.5 },
      "A356": { systemId: "al-si", composition: 7 },
      "Ti–6Al–4V": { systemId: "ti-al", composition: 6 },
    };
    const mapping = mappings[alloyName];
    if (!mapping) return;
    const next = systems.find((item) => item.id === mapping.systemId) ?? systems[0];
    setSystemId(next.id);
    setComposition(mapping.composition);
    setTempMin(next.tempMin);
    setTempMax(next.tempMax);
    setRunConfig({ systemId: next.id, composition: mapping.composition, tempMin: next.tempMin, tempMax: next.tempMax, pressure });
    setRunNumber((value) => value + 1);
    setView("workspace");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadMessage(`${filename} downloaded`);
    window.setTimeout(() => setDownloadMessage(""), 2500);
  };

  const exportCsv = () => {
    const keys = resultSystem.phases.map((phase) => phase.key);
    const rows = [
      ["temperature_c", ...keys].join(","),
      ...chartData.map((row) => [row.temperature, ...keys.map((key) => row[key] ?? 0)].join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `iran-thermocalc-${resultSystem.id}-run-${runNumber}.csv`);
  };

  const exportJson = () => {
    const artifact = {
      product: "Iran ThermoCalc",
      exportVersion: "1.0",
      exportedAt: new Date().toISOString(),
      applicationVersion: "prototype-0.1.0",
      warning: "Educational heuristic approximation; not validated for engineering or production decisions.",
      model: {
        id: resultSystem.id,
        label: resultSystem.database,
        implementation: "illustrative heuristic",
        scope: resultSystem.note,
        fractionBasis: "normalized unitless heuristic weight; not mass or mole fraction",
        validity: { compositionWtPct: [0, resultSystem.maxComposition], temperatureC: [resultSystem.tempMin, resultSystem.tempMax], pressureBar: 1 },
        reviewStatus: "unvalidated educational prototype",
        sourceUrl: null,
        license: "prototype code; no third-party CALPHAD parameters included",
      },
      inputs: { compositionWtPct: runConfig.composition, solute: resultSystem.solute, temperatureC: [runConfig.tempMin, runConfig.tempMax], pressureBarReference: runConfig.pressure },
      phases: resultSystem.phases,
      points: chartData,
    };
    const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, `iran-thermocalc-${resultSystem.id}-run-${runNumber}.json`);
  };

  return (
    <div className="app-shell" dir={language === "fa" ? "rtl" : "ltr"}>
      <header className="topbar">
        <button className="brand" onClick={() => setView("workspace")} aria-label="Iran ThermoCalc home">
          <BrandMark />
          <span className="brand-copy">
            <strong>Iran ThermoCalc</strong>
            <small>Open materials intelligence</small>
          </span>
        </button>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button aria-current={view === "workspace" ? "page" : undefined} className={view === "workspace" ? "active" : ""} onClick={() => setView("workspace")}>
            <ChartNoAxesCombined size={17} /> {t.workspace}
          </button>
          <button aria-current={view === "database" ? "page" : undefined} className={view === "database" ? "active" : ""} onClick={() => setView("database")}>
            <Database size={17} /> {t.database}
          </button>
          <button aria-current={view === "method" ? "page" : undefined} className={view === "method" ? "active" : ""} onClick={() => setView("method")}>
            <BookOpen size={17} /> {t.method}
          </button>
        </nav>

        <div className="topbar-actions">
          <span className="prototype-pill"><span /> Open-source UI prototype</span>
          <button
            className="icon-text-button"
            onClick={() => setLanguage(language === "en" ? "fa" : "en")}
            aria-label="Switch language"
          >
            <Languages size={17} /> {language === "en" ? "فارسی (آزمایشی)" : "EN"}
          </button>
          <button className="round-button" onClick={() => setView("method")} aria-label="Help and documentation">
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <div className="trust-strip">
        <ShieldCheck size={15} />
        <span>Independent research prototype · not affiliated with Thermo-Calc Software AB</span>
        <span className="trust-strip-end">Source roadmap documented · SI units · warning-bearing exports</span>
      </div>

      {view === "workspace" && (
        <main className="workspace-grid">
          <aside className="project-panel panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{t.projects}</span>
                <h2>Alloy study 01</h2>
              </div>
              <button className="quiet-icon" aria-label="Project options"><ChevronDown size={18} /></button>
            </div>

            <div className="workflow">
              <button className="workflow-step complete">
                <span className="step-icon"><Database size={16} /></span>
                <span><small>01</small><strong>System definition</strong><em>{system.database}</em></span>
                <CheckCircle2 size={16} />
              </button>
              <span className="workflow-line" />
              <button className="workflow-step active">
                <span className="step-icon"><Gauge size={16} /></span>
                <span><small>02</small><strong>Phase model</strong><em>Illustrative one-axis sweep</em></span>
                <span className="step-dot" />
              </button>
              <span className="workflow-line" />
              <button className="workflow-step">
                <span className="step-icon"><ChartNoAxesCombined size={16} /></span>
                <span><small>03</small><strong>Plot renderer</strong><em>Normalized weights / T</em></span>
              </button>
              <span className="workflow-line" />
              <button className="workflow-step">
                <span className="step-icon"><Table2 size={16} /></span>
                <span><small>04</small><strong>Table renderer</strong><em>36 calculated points</em></span>
              </button>
            </div>

            <div className="project-meta">
              <div><span>Engine</span><strong>Illustrative heuristic</strong></div>
              <div><span>Last run</span><strong>Run #{String(runNumber).padStart(3, "0")}</strong></div>
              <div><span>State</span><strong className="state-good">Ready</strong></div>
            </div>

            <div className="mini-notice">
              <Info size={16} />
              <p><strong>Know your confidence.</strong> Demo phase models are visibly labeled and never mixed with validated production data.</p>
            </div>
          </aside>

          <section className="builder-panel panel">
            <div className="panel-heading builder-heading">
              <div>
                <span className="eyebrow">Calculation setup</span>
                <h1>{t.system}</h1>
              </div>
              <span className={isDirty ? "saved-state dirty" : "saved-state"}>
                {isDirty ? <Info size={15} /> : <CheckCircle2 size={15} />}
                {isDirty ? "Inputs changed" : "Results current"}
              </span>
            </div>

            <div className="field-group">
              <label htmlFor="system-select">System & model</label>
              <div className="select-wrap">
                <select id="system-select" value={systemId} onChange={(event) => switchSystem(event.target.value)}>
                  {systems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} · {item.database}</option>
                  ))}
                </select>
                <ChevronDown size={17} />
              </div>
              <div className="field-support">
                <span className="verified-tag"><ShieldCheck size={13} /> Model scope attached</span>
                <span>{system.family}</span>
              </div>
            </div>

            <div className="field-group">
              <div className="label-row">
                <label>{t.composition}</label>
                <span>wt%</span>
              </div>
              <div className="composition-cards">
                <div className="element-card base-element">
                  <span>{system.base}</span>
                  <div><strong>{(100 - composition).toFixed(2)}</strong><small>dependent</small></div>
                </div>
                <div className="element-card solute-element">
                  <span>{system.solute}</span>
                  <div>
                    <input
                      aria-label={`${system.solute} composition in weight percent`}
                      type="number"
                      min="0"
                      max={system.maxComposition}
                      step={compositionStep}
                      value={composition}
                      onChange={(event) => setComposition(Math.min(system.maxComposition, Math.max(0, Number(event.target.value))))}
                    />
                    <small>wt%</small>
                  </div>
                </div>
              </div>
              <input
                className="range-input"
                aria-label={`${system.solute} composition slider`}
                type="range"
                min="0"
                max={system.maxComposition}
                step={compositionStep}
                value={composition}
                onChange={(event) => setComposition(Number(event.target.value))}
              />
              <div className="range-labels"><span>0</span><span>{system.maxComposition} wt% {system.solute}</span></div>
            </div>

            <div className="section-divider" />

            <div className="field-group">
              <div className="label-row">
                <label>{t.conditions}</label>
                <span>One axis</span>
              </div>
              <div className="conditions-grid">
                <label className="compact-field">
                  <span><Thermometer size={15} /> T start</span>
                  <div><input aria-invalid={invalidRange} type="number" min={system.tempMin} max={system.tempMax} value={tempMin} onChange={(event) => setTempMin(Number(event.target.value))} /><small>°C</small></div>
                </label>
                <label className="compact-field">
                  <span><Thermometer size={15} /> T end</span>
                  <div><input aria-invalid={invalidRange} type="number" min={system.tempMin} max={system.tempMax} value={tempMax} onChange={(event) => setTempMax(Number(event.target.value))} /><small>°C</small></div>
                </label>
                <label className="compact-field">
                  <span><Gauge size={15} /> {t.pressure}</span>
                  <div><input type="number" value={pressure} disabled aria-label="Fixed reference pressure" /><small>bar · fixed</small></div>
                </label>
                <div className="compact-field calculated-field">
                  <span><Layers3 size={15} /> Points</span>
                  <div><strong>36</strong><small>auto</small></div>
                </div>
              </div>
              {invalidRange && <p className="validation-error" role="alert">Use an increasing range within {system.tempMin}–{system.tempMax} °C for this illustrative model.</p>}
            </div>

            <div className="model-note">
              <FlaskConical size={18} />
              <p><strong>Model scope</strong>{system.note}</p>
            </div>

            <button className="run-button" onClick={runCalculation} disabled={isRunning || invalidRange}>
              {isRunning ? <span className="spinner" /> : <Play size={18} fill="currentColor" />}
              {isRunning ? t.calculating : isDirty ? "Update results" : t.run}
            </button>
          </section>

          <section className="results-panel panel">
            <div className="results-header">
              <div>
                <span className="eyebrow">{t.results}</span>
                <h2>Normalized phase weights <span>vs temperature</span></h2>
              </div>
              <div className="results-actions">
                <div className="segmented" aria-label="Result format">
                  <button aria-pressed={resultView === "plot"} className={resultView === "plot" ? "active" : ""} onClick={() => setResultView("plot")}><ChartNoAxesCombined size={15} /> {t.plot}</button>
                  <button aria-pressed={resultView === "table"} className={resultView === "table" ? "active" : ""} onClick={() => setResultView("table")}><Table2 size={15} /> {t.table}</button>
                </div>
                <button className="export-button" onClick={exportCsv}><Download size={16} /> CSV</button>
                <button className="export-button" onClick={exportJson}><Download size={16} /> JSON</button>
              </div>
            </div>
            <span className="download-toast" role="status" aria-live="polite">{downloadMessage}</span>

            <div className="result-summary">
              <div><span>System</span><strong>{resultSystem.name}</strong></div>
              <div><span>Composition</span><strong>{runConfig.composition.toFixed(2)} wt% {resultSystem.solute}</strong></div>
              <div><span>Range</span><strong>{runConfig.tempMin}–{runConfig.tempMax} °C</strong></div>
              <div><span>Basis</span><strong>Unitless heuristic weight</strong></div>
            </div>

            {isDirty && (
              <div className="stale-banner" role="status">
                <Info size={16} />
                <span><strong>Results are from the previous inputs.</strong> Run the calculation to refresh this plot.</span>
                <button onClick={runCalculation} disabled={invalidRange}>Refresh now</button>
              </div>
            )}

            {resultView === "plot" ? (
              <div className="chart-wrap" aria-label="Interactive normalized heuristic phase weight chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart accessibilityLayer aria-label={`${resultSystem.name} normalized heuristic phase weights from ${runConfig.tempMin} to ${runConfig.tempMax} degrees Celsius`} data={chartData} margin={{ top: 18, right: 18, left: -12, bottom: 4 }}>
                    <CartesianGrid stroke="#dfe5ec" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="temperature" type="number" domain={[runConfig.tempMin, runConfig.tempMax]} tick={{ fill: "#657181", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#cdd5df" }} unit="°" />
                    <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={{ fill: "#657181", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value, name) => [`${(Number(value) * 100).toFixed(1)}%`, String(name)]}
                      labelFormatter={(label) => `${label} °C`}
                      contentStyle={{ border: "1px solid #dfe5ec", borderRadius: 12, boxShadow: "0 12px 30px rgba(18,35,55,.14)" }}
                    />
                    {resultSystem.phases.map((phase) => (
                      <Line key={phase.key} type="linear" dataKey={phase.key} name={phase.label} stroke={phase.color} strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: "white" }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Temperature</th>{resultSystem.phases.map((phase) => <th key={phase.key}>{phase.label}</th>)}</tr></thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={row.temperature}>
                        <td>{row.temperature} °C</td>
                        {resultSystem.phases.map((phase) => <td key={phase.key}>{((row[phase.key] ?? 0) * 100).toFixed(2)}%</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="phase-legend">
              {resultSystem.phases.map((phase) => (
                <div key={phase.key}><span style={{ backgroundColor: phase.color }} /><p><strong>{phase.label}</strong><small>Illustrative normalized fraction</small></p></div>
              ))}
            </div>

            <div className="confidence-bar">
              <ShieldCheck size={17} />
              <p><strong>Educational confidence</strong><span>Topology-informed approximation · not certified for production decisions</span></p>
              <button onClick={() => setView("method")}>View provenance</button>
            </div>
          </section>
        </main>
      )}

      {view === "database" && (
        <main className="library-page">
          <section className="library-hero">
            <div>
              <span className="eyebrow"><Database size={15} /> Materials intelligence</span>
              <h1>A database you can interrogate, not just trust.</h1>
              <p>118 elements, 24 engineering alloy presets and six transparent demo data packs. Every production dataset slot is designed to carry source, version, validity range and review status.</p>
            </div>
            <div className="library-stats">
              <div><strong>118</strong><span>elements</span></div>
              <div><strong>24</strong><span>alloy presets</span></div>
              <div><strong>6</strong><span>phase systems</span></div>
              <div><strong>4</strong><span>public references</span></div>
            </div>
          </section>

          <section className="library-layout">
            <aside className="pack-sidebar panel">
              <div className="panel-heading"><div><span className="eyebrow">Coverage</span><h2>Data packs</h2></div></div>
              <div className="pack-list">
                {dataPacks.map((pack) => (
                  <button key={pack.code} aria-pressed={selectedPackCode === pack.code} className={selectedPackCode === pack.code ? "active" : ""} onClick={() => setSelectedPackCode(pack.code)}>
                    <span className="pack-code">{pack.code}</span>
                    <span><strong>{pack.title}</strong><small>{pack.models} models · {pack.phases} displayed phases</small></span>
                    <em>{pack.status}</em>
                  </button>
                ))}
              </div>
              <div className="database-roadmap">
                <Sparkles size={17} />
                <p><strong>Production roadmap</strong>Import licensed or internally assessed TDB parameter sets without changing the user experience.</p>
              </div>
            </aside>

            <section className="catalog-panel panel">
              <div className="catalog-toolbar">
                <div className="segmented catalog-switch" aria-label="Catalog type">
                  <button aria-pressed={dataMode === "elements"} className={dataMode === "elements" ? "active" : ""} onClick={() => setDataMode("elements")}><Atom size={15} /> Elements</button>
                  <button aria-pressed={dataMode === "alloys"} className={dataMode === "alloys" ? "active" : ""} onClick={() => setDataMode("alloys")}><Layers3 size={15} /> Alloy presets</button>
                </div>
                <div className="search-field">
                  <Search size={17} />
                  <input aria-label={t.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
                  {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
                </div>
              </div>

              <div className="pack-context" role="status">
                <span>{selectedPack.code}</span>
                <p><strong>{selectedPack.title}</strong><small>{selectedPack.models} illustrative models · {selectedPack.phases} displayed phases · {selectedPack.status}</small></p>
              </div>

              {dataMode === "elements" ? (
                <>
                  <div className="catalog-intro"><p><strong>{filteredElements.length} {filteredElements.length === 1 ? "element" : "elements"}</strong>Open periodic reference catalog</p><span>periodic-table 0.0.8 · ISC license</span></div>
                  {filteredElements.length === 0 ? (
                    <div className="empty-state"><Search size={22} /><h3>No elements match “{query}”</h3><p>Try an element symbol, atomic number, or group name.</p><button onClick={() => setQuery("")}>Clear search</button></div>
                  ) : <div className="elements-grid">
                    {filteredElements.map((element) => (
                      <article className="periodic-card" key={element.atomicNumber}>
                        <span className="atomic-number">{element.atomicNumber}</span>
                        <strong>{element.symbol}</strong>
                        <h3>{element.name}</h3>
                        <dl>
                          <div><dt>Atomic mass</dt><dd>{String(element.atomicMass).replace(/\(.*\)/, "")}</dd></div>
                          <div><dt>Melting</dt><dd>{element.meltingPoint || "—"}{element.meltingPoint ? " K" : ""}</dd></div>
                          <div><dt>Density</dt><dd>{element.density || "—"}{element.density ? " g/cm³" : ""}</dd></div>
                        </dl>
                      </article>
                    ))}
                  </div>}
                </>
              ) : (
                <>
                  <div className="catalog-intro"><p><strong>{filteredAlloys.length} {filteredAlloys.length === 1 ? "preset" : "presets"}</strong>Nominal engineering compositions</p><span>Verify against the applicable material standard</span></div>
                  {filteredAlloys.length === 0 ? (
                    <div className="empty-state"><Search size={22} /><h3>No alloy presets match “{query}”</h3><p>Try a grade, family, system, or application.</p><button onClick={() => setQuery("")}>Clear search</button></div>
                  ) : <div className="alloy-grid">
                    {filteredAlloys.map((alloy) => (
                      <article className="alloy-card" key={alloy.name}>
                        <div><span>{alloy.family}</span><em>{alloy.system}</em></div>
                        <h3>{alloy.name}</h3>
                        <p>{alloy.composition}</p>
                        <footer><span>Typical use</span><strong>{alloy.use}</strong></footer>
                        {["AISI 1040", "AISI 430", "A356", "Ti–6Al–4V"].includes(alloy.name) ? (
                          <button className="use-alloy-button" onClick={() => useAlloyInWorkspace(alloy.name)}>Explore simplified binary →</button>
                        ) : (
                          <span className="catalog-only">Catalog reference only</span>
                        )}
                      </article>
                    ))}
                  </div>}
                </>
              )}
            </section>
          </section>
        </main>
      )}

      {view === "method" && (
        <main className="method-page">
          <section className="method-hero">
            <div className="method-image" role="img" aria-label="Metallurgy laboratory research">
              <span>Materials research in practice</span>
              <a href="https://www.uni-due.de/iw/en/research/current_research_reports.php" target="_blank" rel="noreferrer">Image · University of Duisburg-Essen ↗</a>
            </div>
            <div className="method-copy">
              <span className="eyebrow"><ShieldCheck size={15} /> Scientific integrity</span>
              <h1>Good materials software starts with honest data.</h1>
              <p>Thermo-Calc’s commercial strength comes from expert-assessed CALPHAD databases—not from interface design alone. Iran ThermoCalc therefore separates the polished application shell from its current open educational models, and provides a clean path to licensed or independently assessed production parameter sets.</p>
              <div className="method-badges"><span>Schema-ready lineage</span><span>Explicit model limits</span><span>Heuristic labeling</span><span>Export warnings</span></div>
            </div>
          </section>

          <section className="method-grid">
            <article className="method-card feature-card">
              <span className="card-number">01</span>
              <FlaskConical size={23} />
              <h2>Define the system</h2>
              <p>Choose a material-specific database, elements, composition units and dependent component. The workspace keeps the database and model scope visible.</p>
            </article>
            <article className="method-card feature-card">
              <span className="card-number">02</span>
              <Gauge size={23} />
              <h2>Set state conditions</h2>
              <p>Set temperature, pressure, composition and calculation path. The prototype implements one-axis educational calculations for six representative binary systems.</p>
            </article>
            <article className="method-card feature-card">
              <span className="card-number">03</span>
              <ChartNoAxesCombined size={23} />
              <h2>Interrogate the result</h2>
              <p>Switch between plot and table, inspect phase fractions and export the calculated points. Production models should add uncertainty and assessment metadata.</p>
            </article>
          </section>

          <section className="source-section">
            <div className="source-heading">
              <div><span className="eyebrow"><Globe2 size={15} /> Research base</span><h2>Sources & benchmark references</h2></div>
              <p>These are roadmap references, not record-level citations for the illustrative formulas. No Thermo-Calc commercial database files or proprietary parameters are included.</p>
            </div>
            <div className="source-grid">
              {sources.map((source) => (
                <a className="source-card" href={source.href} target="_blank" rel="noreferrer" key={source.title}>
                  <span>{source.type}</span>
                  <h3>{source.title}</h3>
                  <p>{source.label}</p>
                  <strong>View reference ↗</strong>
                </a>
              ))}
            </div>
          </section>

          <section className="disclaimer-card">
            <Info size={22} />
            <div><h2>What is production-ready—and what is not</h2><p>The application, interaction model, responsive UI, element catalog, alloy preset library and CSV export are functional. The six phase models are educational approximations for product validation and must be replaced or verified with assessed CALPHAD parameters before engineering use.</p></div>
            <button onClick={() => setView("workspace")}>Open workspace</button>
          </section>
        </main>
      )}
    </div>
  );
}
