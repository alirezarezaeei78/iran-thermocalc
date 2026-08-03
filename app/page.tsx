"use client";

import { useEffect, useMemo, useState } from "react";
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
  FileSearch,
  Microscope,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Thermometer,
  Trash2,
  Workflow,
} from "lucide-react";
import { alloyPresets, calculatePoint, calculateSystem, dataPacks, sources, systems } from "./data";
import PhaseChart from "./PhaseChart";
import { runLocalMulticomponentStudy, type LocalStudyResult } from "./localMulticomponent";

type View = "workspace" | "lab" | "database" | "coverage" | "method";
type ResultView = "plot" | "table";
type Language = "en" | "fa";
type WorkflowStep = "system" | "model" | "plot" | "table";
type CalculatorMode = "one-axis" | "single-point" | "solidification";
type LabMode = "study" | "research";
type StudyComponent = { symbol: string; wtPercent: number; balance?: boolean };
type CurationJob = { id: number; source: string; identifier: string; system: string; property: string; stage: string };

type ElementRecord = {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: string;
  meltingPoint: number | string;
  density: number | string;
  groupBlock: string;
};

const copy = {
  en: {
    workspace: "Workspace",
    lab: "Multicomponent lab",
    database: "Data library",
    coverage: "Coverage",
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
    lab: "آزمایشگاه چندجزئی",
    database: "کتابخانه داده",
    coverage: "پوشش امکانات",
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

const calculatorModes: { id: CalculatorMode; label: string; description: string }[] = [
  { id: "one-axis", label: "One-axis", description: "36-point temperature sweep" },
  { id: "single-point", label: "Single point", description: "Phase weights at one state" },
  { id: "solidification", label: "Solidification proxy", description: "Cooling-window exploration" },
];

const capabilityBenchmark = [
  { capability: "Single equilibrium", official: "Built-in calculator", iran: "Educational phase-weight proxy", status: "proxy" },
  { capability: "One-axis calculation", official: "Built-in calculator", iran: "Educational proxy · plot, table, exports", status: "proxy" },
  { capability: "Multicomponent system definition", official: "Arbitrary components with assessed databases", iran: "Working 2–6 component local screening engine", status: "proxy" },
  { capability: "Grid calculation", official: "Built-in calculator", iran: "Roadmap", status: "roadmap" },
  { capability: "Phase diagram", official: "Built-in calculator", iran: "Local estimated phase-weight windows", status: "proxy" },
  { capability: "Scheil solidification", official: "Built-in calculator", iran: "Cooling-path proxy only", status: "proxy" },
  { capability: "Property models", official: "Built-in + model libraries", iran: "Local SFE, ordering and TCP screening indices", status: "proxy" },
  { capability: "Material-to-material", official: "Built-in calculator", iran: "Not implemented", status: "missing" },
  { capability: "Aqueous / Pourbaix", official: "Built-in calculators", iran: "Not implemented", status: "missing" },
  { capability: "Parameter optimization", official: "PARROT module", iran: "Not implemented", status: "missing" },
  { capability: "Diffusion & precipitation", official: "DICTRA / TC-PRISMA add-ons", iran: "External solver + assessed data required", status: "data" },
  { capability: "Programmable SDK", official: "Python, MATLAB and TQ APIs", iran: "CSV/JSON now · API roadmap", status: "roadmap" },
] as const;

const studyTemplates: { id: string; name: string; family: string; components: StudyComponent[]; temperature: [number, number] }[] = [
  { id: "fe-cr-ni-mo", name: "Fe–Cr–Ni–Mo", family: "Stainless steel", components: [{ symbol: "Fe", wtPercent: 0, balance: true }, { symbol: "Cr", wtPercent: 18 }, { symbol: "Ni", wtPercent: 10 }, { symbol: "Mo", wtPercent: 2.5 }], temperature: [500, 1700] },
  { id: "ni-al-cr-co-ti-ta", name: "Ni–Al–Cr–Co–Ti–Ta", family: "Nickel superalloy", components: [{ symbol: "Ni", wtPercent: 0, balance: true }, { symbol: "Al", wtPercent: 5.5 }, { symbol: "Cr", wtPercent: 15 }, { symbol: "Co", wtPercent: 10 }, { symbol: "Ti", wtPercent: 3 }, { symbol: "Ta", wtPercent: 2 }], temperature: [600, 1650] },
  { id: "ti-al-v-mo", name: "Ti–Al–V–Mo", family: "Titanium alloy", components: [{ symbol: "Ti", wtPercent: 0, balance: true }, { symbol: "Al", wtPercent: 6 }, { symbol: "V", wtPercent: 4 }, { symbol: "Mo", wtPercent: 1 }], temperature: [400, 1800] },
  { id: "al-mg-si-cu", name: "Al–Mg–Si–Cu", family: "Aluminium alloy", components: [{ symbol: "Al", wtPercent: 0, balance: true }, { symbol: "Mg", wtPercent: 1 }, { symbol: "Si", wtPercent: 0.7 }, { symbol: "Cu", wtPercent: 0.3 }], temperature: [250, 800] },
  { id: "co-cr-ni-w", name: "Co–Cr–Ni–W", family: "Cobalt superalloy", components: [{ symbol: "Co", wtPercent: 0, balance: true }, { symbol: "Cr", wtPercent: 22 }, { symbol: "Ni", wtPercent: 10 }, { symbol: "W", wtPercent: 7 }], temperature: [600, 1700] },
];

const analysisTargets = [
  { id: "phase-diagram", label: "Phase diagram", detail: "Estimated phase-weight windows", requirement: "Local structure-tendency model" },
  { id: "gibbs-energy", label: "Mixing energy", detail: "Ideal entropy + pair-interaction proxy", requirement: "Local deterministic estimate" },
  { id: "phase-stability", label: "Phase stability", detail: "Estimated phase tendency ranking", requirement: "Local structure screening" },
  { id: "sfe", label: "SFE screening", detail: "Unitless stacking-fault tendency index", requirement: "Local screening index" },
  { id: "solubility", label: "Solid-solution tendency", detail: "Competition with ordered and TCP phases", requirement: "Local competition model" },
  { id: "intermetallic", label: "Intermetallics", detail: "Ordered-compound tendency screening", requirement: "Local composition-pair model" },
  { id: "tcp", label: "TCP phases", detail: "σ, μ, Laves family risk screening", requirement: "Local refractory/matrix model" },
] as const;

const researchSources = [
  { name: "NIST Alloy Data", scope: "Experimental thermophysical data · unary, binary and ternary metals", access: "Public · point-level citations and uncertainty", href: "https://www.nist.gov/mml/acmd/trc/nist-alloy-data" },
  { name: "Materials Project", scope: "Computed structures, thermodynamics, stability and alloy endpoints", access: "API key required · provenance endpoints", href: "https://docs.materialsproject.org/downloading-data/using-the-api/getting-started" },
  { name: "OQMD", scope: "Computed formation energies and phase-stability data", access: "Open REST / OPTiMaDe · CC BY 4.0", href: "https://www.oqmd.org/api/" },
  { name: "Archival literature", scope: "DOI-linked experimental and CALPHAD evidence", access: "Metadata first · full-text rights checked per record", href: "https://www.nist.gov/node/1283981" },
] as const;

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
  const [probeTemperature, setProbeTemperature] = useState(900);
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>("one-axis");
  const pressure = 1;
  const [resultView, setResultView] = useState<ResultView>("plot");
  const [isRunning, setIsRunning] = useState(false);
  const [runNumber, setRunNumber] = useState(1);
  const [runConfig, setRunConfig] = useState({
    systemId: "fe-c",
    composition: 0.4,
    tempMin: 400,
    tempMax: 1600,
    probeTemperature: 900,
    mode: "one-axis" as CalculatorMode,
    pressure: 1,
  });
  const [query, setQuery] = useState("");
  const [dataMode, setDataMode] = useState<"elements" | "alloys">("elements");
  const [elements, setElements] = useState<ElementRecord[]>([]);
  const [elementCatalogStatus, setElementCatalogStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [selectedPackCode, setSelectedPackCode] = useState("IRFE");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStep>("model");
  const [projectPanelOpen, setProjectPanelOpen] = useState(true);
  const [labMode, setLabMode] = useState<LabMode>("study");
  const [selectedTemplateId, setSelectedTemplateId] = useState("fe-cr-ni-mo");
  const [studyComponents, setStudyComponents] = useState<StudyComponent[]>(studyTemplates[0].components);
  const [studyTempMin, setStudyTempMin] = useState(studyTemplates[0].temperature[0]);
  const [studyTempMax, setStudyTempMax] = useState(studyTemplates[0].temperature[1]);
  const [newElementSymbol, setNewElementSymbol] = useState("C");
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>(["phase-diagram", "gibbs-energy", "phase-stability", "sfe", "solubility", "intermetallic", "tcp"]);
  const [studyResult, setStudyResult] = useState<LocalStudyResult | null>(null);
  const [isStudyRunning, setIsStudyRunning] = useState(false);
  const [researchSource, setResearchSource] = useState(researchSources[0].name);
  const [researchIdentifier, setResearchIdentifier] = useState("");
  const [researchProperty, setResearchProperty] = useState("Phase equilibria");
  const [curationJobs, setCurationJobs] = useState<CurationJob[]>([]);

  const t = copy[language];
  const system = systems.find((item) => item.id === systemId) ?? systems[0];
  const resultSystem = systems.find((item) => item.id === runConfig.systemId) ?? systems[0];
  const selectedPack = dataPacks.find((item) => item.code === selectedPackCode) ?? dataPacks[0];
  const fixedCompositionTotal = studyComponents.filter((item) => !item.balance).reduce((sum, item) => sum + item.wtPercent, 0);
  const balanceComposition = Math.max(0, 100 - fixedCompositionTotal);
  const invalidStudy = studyComponents.length < 2 || studyComponents.length > 6 || fixedCompositionTotal >= 100 || studyTempMin >= studyTempMax;
  const elementBySymbol = useMemo(() => new Map(elements.map((element) => [element.symbol, element])), [elements]);
  const availableStudyElements = useMemo(
    () => elements.filter((element) => !studyComponents.some((item) => item.symbol === element.symbol)),
    [elements, studyComponents],
  );
  const compositionStep = system.maxComposition === 6.67 ? 0.01 : system.maxComposition > 50 ? 1 : 0.05;
  const invalidRange = tempMax <= tempMin || tempMin < system.tempMin || tempMax > system.tempMax;
  const invalidPoint = probeTemperature < system.tempMin || probeTemperature > system.tempMax;
  const invalidInput = calculatorMode === "single-point" ? invalidPoint : invalidRange;
  const isDirty =
    systemId !== runConfig.systemId ||
    composition !== runConfig.composition ||
    tempMin !== runConfig.tempMin ||
    tempMax !== runConfig.tempMax ||
    probeTemperature !== runConfig.probeTemperature ||
    calculatorMode !== runConfig.mode ||
    pressure !== runConfig.pressure;
  const chartData = useMemo(
    () => {
      const activeSystem = systems.find((item) => item.id === runConfig.systemId) ?? systems[0];
      const safeMin = runConfig.mode === "single-point" ? activeSystem.tempMin : runConfig.tempMin;
      const safeMax = runConfig.mode === "single-point" ? activeSystem.tempMax : runConfig.tempMax;
      return calculateSystem(runConfig.systemId, runConfig.composition, safeMin, safeMax);
    },
    [runConfig],
  );
  const pointResult = useMemo(
    () => {
      const activeSystem = systems.find((item) => item.id === runConfig.systemId) ?? systems[0];
      const safeProbe = runConfig.mode === "single-point"
        ? runConfig.probeTemperature
        : Math.round((activeSystem.tempMin + activeSystem.tempMax) / 2);
      return calculatePoint(runConfig.systemId, runConfig.composition, safeProbe);
    },
    [runConfig.systemId, runConfig.composition, runConfig.probeTemperature, runConfig.mode],
  );
  const orderedPathData = useMemo(
    () => runConfig.mode === "solidification" ? [...chartData].reverse() : chartData,
    [chartData, runConfig.mode],
  );
  const solidificationMetrics = useMemo(() => {
    const liquidKey = resultSystem.phases.find((phase) => phase.key === "liquid")?.key;
    if (!liquidKey) return null;
    const coolingPath = [...chartData].reverse();
    const firstSolid = coolingPath.find((row) => 1 - (row[liquidKey] ?? 0) > 0.01);
    const nearlySolid = coolingPath.find((row) => 1 - (row[liquidKey] ?? 0) >= 0.99);
    const lastPoint = chartData[0];
    const solidAtMinimum = 1 - (lastPoint?.[liquidKey] ?? 0);
    return {
      firstSolid: firstSolid?.temperature ?? null,
      nearlySolid: nearlySolid?.temperature ?? null,
      interval: firstSolid && nearlySolid ? firstSolid.temperature - nearlySolid.temperature : null,
      solidAtMinimum,
      sampleSpacing: (runConfig.tempMax - runConfig.tempMin) / Math.max(1, chartData.length - 1),
    };
  }, [chartData, resultSystem, runConfig.tempMin, runConfig.tempMax]);

  const filteredElements = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return elements;
    return elements.filter((element) =>
      `${element.name} ${element.symbol} ${element.atomicNumber} ${element.groupBlock}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, elements]);

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

  useEffect(() => {
    if ((view !== "database" && view !== "lab") || elements.length > 0) return;
    let cancelled = false;
    void import("periodic-table/data.json")
      .then((module) => {
        if (cancelled) return;
        setElements(module.default as ElementRecord[]);
        setElementCatalogStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setElementCatalogStatus("error");
      });
    return () => { cancelled = true; };
  }, [view, elements.length, catalogRetry]);

  const switchDataMode = (nextMode: "elements" | "alloys") => {
    setDataMode(nextMode);
    setQuery("");
  };

  const switchSystem = (nextId: string) => {
    const next = systems.find((item) => item.id === nextId) ?? systems[0];
    setSystemId(next.id);
    setComposition(next.defaultComposition);
    setTempMin(next.tempMin);
    setTempMax(next.tempMax);
    setProbeTemperature(Math.round((next.tempMin + next.tempMax) / 2));
    setActiveWorkflowStep("system");
  };

  const switchCalculatorMode = (mode: CalculatorMode) => {
    setCalculatorMode(mode);
    setActiveWorkflowStep("model");
  };

  const showResultView = (nextView: ResultView) => {
    setResultView(nextView);
    setActiveWorkflowStep(nextView);
  };

  const openWorkflowStep = (step: WorkflowStep) => {
    setActiveWorkflowStep(step);
    if (step === "plot" || step === "table") setResultView(step);

    window.requestAnimationFrame(() => {
      const targetId = step === "system"
        ? "system-select"
        : step === "model"
          ? "composition-input"
          : "results-section";
      const target = document.getElementById(targetId);
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      window.setTimeout(() => target?.focus({ preventScroll: true }), 260);
    });
  };

  const runCalculation = () => {
    setIsRunning(true);
    setActiveWorkflowStep(calculatorMode === "single-point" ? "model" : resultView);
    window.setTimeout(() => {
      setRunConfig({ systemId, composition, tempMin, tempMax, probeTemperature, mode: calculatorMode, pressure });
      setRunNumber((value) => value + 1);
      setIsRunning(false);
    }, 480);
  };

  const exploreAlloyInWorkspace = (alloyName: string) => {
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
    const nextProbe = Math.round((next.tempMin + next.tempMax) / 2);
    setProbeTemperature(nextProbe);
    setCalculatorMode("one-axis");
    setRunConfig({ systemId: next.id, composition: mapping.composition, tempMin: next.tempMin, tempMax: next.tempMax, probeTemperature: nextProbe, mode: "one-axis", pressure });
    setRunNumber((value) => value + 1);
    setView("workspace");
    setActiveWorkflowStep("plot");
  };

  const applyStudyTemplate = (templateId: string) => {
    const template = studyTemplates.find((item) => item.id === templateId) ?? studyTemplates[0];
    setSelectedTemplateId(template.id);
    setStudyComponents(template.components.map((item) => ({ ...item })));
    setStudyTempMin(template.temperature[0]);
    setStudyTempMax(template.temperature[1]);
    setStudyResult(null);
  };

  const updateStudyComponent = (symbol: string, value: number) => {
    setStudyComponents((current) => current.map((item) => item.symbol === symbol ? { ...item, wtPercent: Math.max(0, Math.min(99.99, value)) } : item));
    setStudyResult(null);
  };

  const addStudyComponent = () => {
    if (!newElementSymbol || studyComponents.length >= 6 || studyComponents.some((item) => item.symbol === newElementSymbol)) return;
    setStudyComponents((current) => [...current, { symbol: newElementSymbol, wtPercent: 0.1 }]);
    const remaining = elements.find((element) => !studyComponents.some((item) => item.symbol === element.symbol) && element.symbol !== newElementSymbol);
    if (remaining) setNewElementSymbol(remaining.symbol);
    setStudyResult(null);
  };

  const removeStudyComponent = (symbol: string) => {
    setStudyComponents((current) => current.filter((item) => item.symbol !== symbol));
    setStudyResult(null);
  };

  const toggleAnalysisTarget = (targetId: string) => {
    setSelectedAnalyses((current) => current.includes(targetId) ? current.filter((item) => item !== targetId) : [...current, targetId]);
    setStudyResult(null);
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

  const runLocalStudy = () => {
    if (invalidStudy || selectedAnalyses.length === 0 || elements.length === 0 || isStudyRunning) return;
    setIsStudyRunning(true);
    window.setTimeout(() => {
      const components = studyComponents.map((component) => ({
        symbol: component.symbol,
        wtPercent: component.balance ? balanceComposition : component.wtPercent,
      }));
      setStudyResult(runLocalMulticomponentStudy(components, elements, studyTempMin, studyTempMax));
      setIsStudyRunning(false);
    }, 260);
  };

  const exportLocalStudyJson = () => {
    if (!studyResult) return;
    const artifact = {
      product: "Iran ThermoCalc",
      exportVersion: "local-multicomponent-screening-1.0",
      exportedAt: new Date().toISOString(),
      warning: "Local deterministic screening estimate; not an assessed CALPHAD equilibrium calculation.",
      requestedAnalyses: analysisTargets.filter((item) => selectedAnalyses.includes(item.id)),
      result: studyResult,
    };
    downloadBlob(new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json;charset=utf-8" }), `iran-thermocalc-${studyResult.system.toLowerCase()}-local-result.json`);
  };

  const exportLocalStudyCsv = () => {
    if (!studyResult) return;
    const rows = [
      "temperature_c,liquid,fcc,bcc,hcp,intermetallic,tcp,gibbs_mix_kj_mol,sfe_index",
      ...studyResult.points.map((point) => [point.temperature, point.liquid, point.fcc, point.bcc, point.hcp, point.intermetallic, point.tcp, point.gibbsMixKJMol, point.sfeIndex].join(",")),
    ];
    downloadBlob(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), `iran-thermocalc-${studyResult.system.toLowerCase()}-local-result.csv`);
  };

  const addCurationJob = () => {
    const identifier = researchIdentifier.trim();
    if (!identifier) return;
    setCurationJobs((current) => [{
      id: Date.now(),
      source: researchSource,
      identifier,
      system: studyComponents.map((item) => item.symbol).join("–"),
      property: researchProperty,
      stage: "Candidate · human review required",
    }, ...current]);
    setResearchIdentifier("");
  };

  const exportCsv = () => {
    const keys = resultSystem.phases.map((phase) => phase.key);
    const exportedPoints = runConfig.mode === "single-point" ? [pointResult] : orderedPathData;
    const rows = [
      ["temperature_c", ...keys].join(","),
      ...exportedPoints.map((row) => [row.temperature, ...keys.map((key) => row[key] ?? 0)].join(",")),
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
      calculation: {
        mode: runConfig.mode,
        solidificationNotice: runConfig.mode === "solidification" ? "Static heuristic cooling-path proxy; this is not a Scheil simulation." : null,
        pointOrder: runConfig.mode === "solidification" ? "high-to-low temperature cooling path" : runConfig.mode === "single-point" ? "single state" : "low-to-high temperature axis",
      },
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
      inputs: {
        compositionWtPct: runConfig.composition,
        solute: resultSystem.solute,
        temperatureC: runConfig.mode === "single-point" ? runConfig.probeTemperature : [runConfig.tempMin, runConfig.tempMax],
        pressureBarReference: runConfig.pressure,
      },
      phases: resultSystem.phases,
      points: runConfig.mode === "single-point" ? [pointResult] : orderedPathData,
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
          <button aria-current={view === "lab" ? "page" : undefined} className={view === "lab" ? "active" : ""} onClick={() => setView("lab")}>
            <Workflow size={17} /> {t.lab}
          </button>
          <button aria-current={view === "database" ? "page" : undefined} className={view === "database" ? "active" : ""} onClick={() => setView("database")}>
            <Database size={17} /> {t.database}
          </button>
          <button aria-current={view === "coverage" ? "page" : undefined} className={view === "coverage" ? "active" : ""} onClick={() => setView("coverage")}>
            <ShieldCheck size={17} /> {t.coverage}
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
              <button
                type="button"
                className="quiet-icon"
                aria-label={projectPanelOpen ? "Collapse project flow" : "Expand project flow"}
                aria-controls="project-flow-content"
                aria-expanded={projectPanelOpen}
                onClick={() => setProjectPanelOpen((open) => !open)}
              >
                <ChevronDown size={18} />
              </button>
            </div>

            <div id="project-flow-content" hidden={!projectPanelOpen}>
              <div className="workflow">
                <button
                  type="button"
                  className={`workflow-step complete ${activeWorkflowStep === "system" ? "active" : ""}`}
                  aria-current={activeWorkflowStep === "system" ? "step" : undefined}
                  onClick={() => openWorkflowStep("system")}
                >
                  <span className="step-icon"><Database size={16} /></span>
                  <span><small>01</small><strong>System definition</strong><em>{system.database}</em></span>
                  <CheckCircle2 size={16} />
                </button>
                <span className="workflow-line" />
                <button
                  type="button"
                  className={`workflow-step ${activeWorkflowStep === "model" ? "active" : ""}`}
                  aria-current={activeWorkflowStep === "model" ? "step" : undefined}
                  onClick={() => openWorkflowStep("model")}
                >
                  <span className="step-icon"><Gauge size={16} /></span>
                  <span><small>02</small><strong>Calculation path</strong><em>{calculatorModes.find((mode) => mode.id === calculatorMode)?.label}</em></span>
                  {activeWorkflowStep === "model" && <span className="step-dot" />}
                </button>
                <span className="workflow-line" />
                <button
                  type="button"
                  className={`workflow-step ${activeWorkflowStep === "plot" ? "active" : ""}`}
                  aria-current={activeWorkflowStep === "plot" ? "step" : undefined}
                  onClick={() => openWorkflowStep("plot")}
                >
                  <span className="step-icon"><ChartNoAxesCombined size={16} /></span>
                  <span><small>03</small><strong>Plot renderer</strong><em>{runConfig.mode === "single-point" ? "Phase-fraction bars" : "Normalized weights / T"}</em></span>
                  {activeWorkflowStep === "plot" && <span className="step-dot" />}
                </button>
                <span className="workflow-line" />
                <button
                  type="button"
                  className={`workflow-step ${activeWorkflowStep === "table" ? "active" : ""}`}
                  aria-current={activeWorkflowStep === "table" ? "step" : undefined}
                  onClick={() => openWorkflowStep("table")}
                >
                  <span className="step-icon"><Table2 size={16} /></span>
                  <span><small>04</small><strong>Table renderer</strong><em>{runConfig.mode === "single-point" ? "1 calculated state" : "36 calculated points"}</em></span>
                  {activeWorkflowStep === "table" && <span className="step-dot" />}
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

            <div className="calculator-switcher" aria-label="Calculation type">
              {calculatorModes.map((mode) => (
                <button
                  type="button"
                  key={mode.id}
                  aria-pressed={calculatorMode === mode.id}
                  className={calculatorMode === mode.id ? "active" : ""}
                  onClick={() => switchCalculatorMode(mode.id)}
                >
                  <span>{mode.label}</span>
                  <small>{mode.description}</small>
                </button>
              ))}
            </div>
            <p className={`mode-context ${calculatorMode === "solidification" ? "warning" : ""}`}>
              {calculatorMode === "one-axis" && "Explore how normalized heuristic phase weights change along temperature."}
              {calculatorMode === "single-point" && "Inspect the phase-weight result at one temperature and composition."}
              {calculatorMode === "solidification" && "Static heuristic cooling-path proxy only. This is not a Scheil calculation."}
            </p>

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
                      id="composition-input"
                      aria-label={`${system.solute} composition in weight percent`}
                      type="number"
                      min="0"
                      max={system.maxComposition}
                      step={compositionStep}
                      value={composition}
                      onChange={(event) => {
                        setComposition(Math.min(system.maxComposition, Math.max(0, Number(event.target.value))));
                        setActiveWorkflowStep("model");
                      }}
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
                onChange={(event) => {
                  setComposition(Number(event.target.value));
                  setActiveWorkflowStep("model");
                }}
              />
              <div className="range-labels"><span>0</span><span>{system.maxComposition} wt% {system.solute}</span></div>
            </div>

            <div className="section-divider" />

            <div className="field-group">
              <div className="label-row">
                <label>{t.conditions}</label>
                <span>{calculatorModes.find((mode) => mode.id === calculatorMode)?.label}</span>
              </div>
              <div className="conditions-grid">
                {calculatorMode === "single-point" ? (
                  <label className="compact-field temperature-point-field">
                    <span><Thermometer size={15} /> Evaluation temperature</span>
                    <div><input aria-invalid={invalidPoint} type="number" min={system.tempMin} max={system.tempMax} value={probeTemperature} onChange={(event) => { setProbeTemperature(Number(event.target.value)); setActiveWorkflowStep("model"); }} /><small>°C</small></div>
                  </label>
                ) : (
                  <>
                    <label className="compact-field">
                      <span><Thermometer size={15} /> {calculatorMode === "solidification" ? "Cooling end · low" : "T start"}</span>
                      <div><input aria-invalid={invalidRange} type="number" min={system.tempMin} max={system.tempMax} value={tempMin} onChange={(event) => { setTempMin(Number(event.target.value)); setActiveWorkflowStep("model"); }} /><small>°C</small></div>
                    </label>
                    <label className="compact-field">
                      <span><Thermometer size={15} /> {calculatorMode === "solidification" ? "Cooling start · high" : "T end"}</span>
                      <div><input aria-invalid={invalidRange} type="number" min={system.tempMin} max={system.tempMax} value={tempMax} onChange={(event) => { setTempMax(Number(event.target.value)); setActiveWorkflowStep("model"); }} /><small>°C</small></div>
                    </label>
                  </>
                )}
                <label className="compact-field">
                  <span><Gauge size={15} /> {t.pressure}</span>
                  <div><input type="number" value={pressure} disabled aria-label="Fixed reference pressure" /><small>bar · fixed</small></div>
                </label>
                <div className="compact-field calculated-field">
                  <span><Layers3 size={15} /> Points</span>
                  <div><strong>{calculatorMode === "single-point" ? 1 : 36}</strong><small>auto</small></div>
                </div>
              </div>
              {invalidInput && <p className="validation-error" role="alert">{calculatorMode === "single-point" ? `Use a temperature within ${system.tempMin}–${system.tempMax} °C.` : `Use an increasing range within ${system.tempMin}–${system.tempMax} °C for this illustrative model.`}</p>}
            </div>

            <div className="model-note">
              <FlaskConical size={18} />
              <p><strong>Model scope</strong>{system.note}</p>
            </div>

            <button className="run-button" onClick={runCalculation} disabled={isRunning || invalidInput}>
              {isRunning ? <span className="spinner" /> : <Play size={18} fill="currentColor" />}
              {isRunning ? t.calculating : isDirty ? "Update results" : calculatorMode === "single-point" ? "Run single point" : calculatorMode === "solidification" ? "Run solidification proxy" : t.run}
            </button>
          </section>

          <section id="results-section" className="results-panel panel" tabIndex={-1}>
            <div className="results-header">
              <div>
                <span className="eyebrow">{t.results}</span>
                <h2>
                  {runConfig.mode === "single-point" ? "Single-state phase weights" : runConfig.mode === "solidification" ? "Solidification-path proxy" : "Normalized phase weights"}
                  <span>{runConfig.mode === "single-point" ? ` at ${runConfig.probeTemperature} °C` : " vs temperature"}</span>
                </h2>
              </div>
              <div className="results-actions">
                {runConfig.mode !== "single-point" && (
                  <div className="segmented" aria-label="Result format">
                    <button aria-pressed={resultView === "plot"} className={resultView === "plot" ? "active" : ""} onClick={() => showResultView("plot")}><ChartNoAxesCombined size={15} /> {t.plot}</button>
                    <button aria-pressed={resultView === "table"} className={resultView === "table" ? "active" : ""} onClick={() => showResultView("table")}><Table2 size={15} /> {t.table}</button>
                  </div>
                )}
                <button className="export-button" onClick={exportCsv}><Download size={16} /> CSV</button>
                <button className="export-button" onClick={exportJson}><Download size={16} /> JSON</button>
              </div>
            </div>
            <span className="download-toast" role="status" aria-live="polite">{downloadMessage}</span>

            <div className="result-summary">
              <div><span>System</span><strong>{resultSystem.name}</strong></div>
              <div><span>Composition</span><strong>{runConfig.composition.toFixed(2)} wt% {resultSystem.solute}</strong></div>
              <div><span>{runConfig.mode === "single-point" ? "State" : "Range"}</span><strong>{runConfig.mode === "single-point" ? `${runConfig.probeTemperature} °C` : `${runConfig.tempMin}–${runConfig.tempMax} °C`}</strong></div>
              <div><span>Basis</span><strong>Unitless heuristic weight</strong></div>
            </div>

            {isDirty && (
              <div className="stale-banner" role="status">
                <Info size={16} />
                <span><strong>Results are from the previous inputs.</strong> Run the calculation to refresh this result.</span>
                <button onClick={runCalculation} disabled={invalidInput}>Refresh now</button>
              </div>
            )}

            {runConfig.mode === "solidification" && solidificationMetrics && (
              <div className="solidification-metrics">
                <div><span>First solid &gt;1%</span><strong>{solidificationMetrics.firstSolid === null ? "Outside range" : `≈ ${solidificationMetrics.firstSolid.toFixed(0)} °C`}</strong></div>
                <div><span>Solid ≥99%</span><strong>{solidificationMetrics.nearlySolid === null ? "Outside range" : `≈ ${solidificationMetrics.nearlySolid.toFixed(0)} °C`}</strong></div>
                <div><span>Solidification window</span><strong>{solidificationMetrics.interval === null ? "—" : `≈ ${solidificationMetrics.interval.toFixed(0)} °C`}</strong></div>
                <div><span>Solid at cooling end</span><strong>{(solidificationMetrics.solidAtMinimum * 100).toFixed(1)}%</strong></div>
                <p><Info size={14} /> High-to-low sampled proxy with ΔT ≈ {solidificationMetrics.sampleSpacing.toFixed(1)} °C. No back diffusion, segregation, or Scheil mass balance is solved.</p>
              </div>
            )}

            {runConfig.mode === "single-point" ? (
              <div className="point-result" aria-label={`Phase weights at ${runConfig.probeTemperature} degrees Celsius`}>
                <div className="point-temperature-card">
                  <Thermometer size={22} />
                  <span>Heuristic model output</span>
                  <strong>{runConfig.probeTemperature} °C</strong>
                  <small>{runConfig.pressure} bar reference pressure</small>
                </div>
                <div className="point-phase-list">
                  {resultSystem.phases.map((phase) => {
                    const fraction = pointResult[phase.key] ?? 0;
                    const state = fraction >= 0.01 ? "nonzero proxy weight" : fraction > 0 ? "trace proxy weight" : "zero proxy weight";
                    return (
                      <div className="point-phase-row" key={phase.key}>
                        <div><span style={{ backgroundColor: phase.color }} /><strong>{phase.label}</strong><em>{state}</em></div>
                        <div className="phase-bar-track"><span style={{ backgroundColor: phase.color, width: `${Math.max(fraction * 100, fraction > 0 ? 1 : 0)}%` }} /></div>
                        <output>{(fraction * 100).toFixed(2)}%</output>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : resultView === "plot" ? (
              <div className="chart-wrap">
                <PhaseChart
                  data={orderedPathData}
                  phases={resultSystem.phases}
                  temperatureMin={runConfig.tempMin}
                  temperatureMax={runConfig.tempMax}
                  systemName={resultSystem.name}
                />
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Temperature</th>{resultSystem.phases.map((phase) => <th key={phase.key}>{phase.label}</th>)}</tr></thead>
                  <tbody>
                    {orderedPathData.map((row) => (
                      <tr key={row.temperature}>
                        <td>{row.temperature} °C</td>
                        {resultSystem.phases.map((phase) => <td key={phase.key}>{((row[phase.key] ?? 0) * 100).toFixed(2)}%</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {runConfig.mode !== "single-point" && <div className="phase-legend">
              {resultSystem.phases.map((phase) => (
                <div key={phase.key}><span style={{ backgroundColor: phase.color }} /><p><strong>{phase.label}</strong><small>Illustrative normalized fraction</small></p></div>
              ))}
            </div>}

            <div className="confidence-bar">
              <ShieldCheck size={17} />
              <p><strong>Educational confidence</strong><span>Topology-informed approximation · not certified for production decisions</span></p>
              <button onClick={() => setView("method")}>View provenance</button>
            </div>
          </section>
        </main>
      )}

      {view === "lab" && (
        <main className="lab-page">
          <section className="lab-hero">
            <div className="lab-hero-copy">
              <span className="eyebrow"><Workflow size={15} /> Voice brief → product workflow</span>
              <h1>From a six-element alloy idea to an instant local screening run.</h1>
              <p>Compose real 2–6 component studies and calculate deterministic phase, mixing-energy, stability and risk estimates directly in the app—without tokens or external services.</p>
              <div className="lab-mode-switch" aria-label="Multicomponent lab mode">
                <button aria-pressed={labMode === "study"} className={labMode === "study" ? "active" : ""} onClick={() => setLabMode("study")}><FlaskConical size={16} /> Study composer</button>
                <button aria-pressed={labMode === "research"} className={labMode === "research" ? "active" : ""} onClick={() => setLabMode("research")}><FileSearch size={16} /> Research pipeline</button>
              </div>
            </div>
            <aside className="voice-brief" aria-label="Requirements captured from the supplied voice notes">
              <span>Captured requirement</span>
              <blockquote lang="fa" dir="rtl">«سیستم‌های سه تا شش جزئی، دیاگرام فازی، انرژی گیبس، پایداری فاز، انرژی نقص چیدمان، حد حلالیت، بین‌فلزی‌ها و فازهای TCP»</blockquote>
              <div className="voice-brief-stats">
                <div><strong>7</strong><small>analysis targets</small></div>
                <div><strong>2–6</strong><small>components</small></div>
                <div><strong>0</strong><small>fabricated values</small></div>
              </div>
            </aside>
          </section>

          {labMode === "study" ? (
            <section className="study-layout">
              <section className="study-builder panel">
                <div className="lab-section-heading">
                  <div><span className="eyebrow">01 · Define</span><h2>System composer</h2></div>
                  <span className="component-count">{studyComponents.length} / 6 components</span>
                </div>

                <label className="lab-field" htmlFor="study-template">
                  <span>Starting template</span>
                  <select id="study-template" value={selectedTemplateId} onChange={(event) => applyStudyTemplate(event.target.value)}>
                    {studyTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.family}</option>)}
                  </select>
                </label>

                <div className="composition-editor" aria-label="Study composition in weight percent">
                  <div className="composition-editor-head"><span>Element</span><span>Composition</span><span>Action</span></div>
                  {studyComponents.map((component) => {
                    const element = elementBySymbol.get(component.symbol);
                    return (
                      <div className="composition-row" key={component.symbol}>
                        <div className="component-symbol"><strong>{component.symbol}</strong><span>{element?.name ?? "Element"}</span></div>
                        {component.balance ? (
                          <output className="composition-value"><strong>{balanceComposition.toFixed(2)}</strong><span>wt% · balance</span></output>
                        ) : (
                          <label className="composition-input">
                            <span className="sr-only">{component.symbol} composition</span>
                            <input aria-label={`${component.symbol} composition in weight percent`} type="number" min="0" max="99.99" step="0.1" value={component.wtPercent} onChange={(event) => updateStudyComponent(component.symbol, Number(event.target.value))} />
                            <small>wt%</small>
                          </label>
                        )}
                        {component.balance ? <span className="balance-pill">Dependent</span> : <button className="remove-component" aria-label={`Remove ${component.symbol}`} onClick={() => removeStudyComponent(component.symbol)} disabled={studyComponents.length <= 2}><Trash2 size={15} /></button>}
                      </div>
                    );
                  })}
                </div>

                <div className="add-component-row">
                  <label>
                    <span className="sr-only">Element to add</span>
                    <select aria-label="Element to add" value={newElementSymbol} onChange={(event) => setNewElementSymbol(event.target.value)} disabled={studyComponents.length >= 6 || elements.length === 0}>
                      {elements.length === 0
                        ? <option value={newElementSymbol}>{elementCatalogStatus === "error" ? "Element catalog unavailable" : "Loading element catalog…"}</option>
                        : availableStudyElements.map((element) => <option key={element.atomicNumber} value={element.symbol}>{element.symbol} · {element.name}</option>)}
                    </select>
                  </label>
                  <button onClick={addStudyComponent} disabled={studyComponents.length >= 6 || !newElementSymbol || elements.length === 0}><Plus size={16} /> Add component</button>
                </div>
                {elementCatalogStatus === "error" && <button className="catalog-retry" onClick={() => { setElementCatalogStatus("idle"); setCatalogRetry((value) => value + 1); }}>Retry element catalog</button>}

                <div className={`study-total ${invalidStudy ? "invalid" : ""}`} role="status">
                  <div><span>Specified</span><strong>{fixedCompositionTotal.toFixed(2)} wt%</strong></div>
                  <div><span>{studyComponents.find((item) => item.balance)?.symbol} balance</span><strong>{balanceComposition.toFixed(2)} wt%</strong></div>
                  <div><span>Total</span><strong>{(fixedCompositionTotal + balanceComposition).toFixed(2)} wt%</strong></div>
                </div>
                {fixedCompositionTotal >= 100 && <p className="validation-error" role="alert">Specified components must total less than 100 wt% so the balance element remains positive.</p>}

                <div className="study-conditions">
                  <label><span><Thermometer size={15} /> Temperature start</span><div><input aria-label="Study minimum temperature" type="number" value={studyTempMin} onChange={(event) => { setStudyTempMin(Number(event.target.value)); setStudyResult(null); }} /><small>°C</small></div></label>
                  <label><span><Thermometer size={15} /> Temperature end</span><div><input aria-label="Study maximum temperature" type="number" value={studyTempMax} onChange={(event) => { setStudyTempMax(Number(event.target.value)); setStudyResult(null); }} /><small>°C</small></div></label>
                  <div><span><Gauge size={15} /> Pressure</span><strong>1 bar</strong><small>reference</small></div>
                </div>
                {studyTempMin >= studyTempMax && <p className="validation-error" role="alert">Temperature end must be higher than temperature start.</p>}
              </section>

              <section className="analysis-contract panel">
                <div className="lab-section-heading">
                  <div><span className="eyebrow">02 · Scope</span><h2>Requested analyses</h2></div>
                  <span className="component-count">{selectedAnalyses.length} selected</span>
                </div>
                <p className="section-intro">Choose the outputs you need, then run the deterministic screening engine directly in this browser. It uses local composition and element data only—no token, account, API, or remote solver.</p>
                <div className="analysis-target-grid">
                  {analysisTargets.map((target) => {
                    const selected = selectedAnalyses.includes(target.id);
                    return (
                      <button key={target.id} aria-pressed={selected} className={selected ? "active" : ""} onClick={() => toggleAnalysisTarget(target.id)}>
                        <span>{selected ? <CheckCircle2 size={17} /> : <span className="target-empty" />}</span>
                        <strong>{target.label}</strong>
                        <small>{target.detail}</small>
                        <em>{target.requirement}</em>
                      </button>
                    );
                  })}
                </div>

                <button className="validate-study-button" disabled={invalidStudy || selectedAnalyses.length === 0 || elements.length === 0 || isStudyRunning} onClick={runLocalStudy}>
                  {isStudyRunning ? <span className="spinner" /> : <Play size={17} fill="currentColor" />} {isStudyRunning ? "Running locally…" : "Run local simulation"}
                </button>

                {!studyResult ? (
                  <div className="preflight-card">
                    <Gauge size={20} />
                    <div><strong>{elements.length === 0 ? "Loading the local element dataset…" : "Ready to calculate locally"}</strong><p>The engine runs 48 temperature states inside the app. Nothing is sent to an external service, and no usage token is consumed.</p></div>
                  </div>
                ) : (
                  <div className="readiness-report" aria-live="polite">
                    <div className="readiness-heading"><span className="eyebrow">Local run complete</span><strong>{studyResult.system} screening results</strong><small>Calculated entirely inside Iran ThermoCalc with the local estimate engine.</small></div>
                    <div className="readiness-summary" aria-label="Study and local engine status">
                      <div className="ready"><CheckCircle2 size={17} /><span><small>Study setup</small><strong>Valid</strong></span></div>
                      <div className="ready"><CheckCircle2 size={17} /><span><small>Local engine</small><strong>Completed</strong></span></div>
                    </div>
                    <div className="readiness-list">
                      <div className="readiness-item pass"><CheckCircle2 size={16} /><span><strong>System contract valid</strong><small>{studyComponents.length} unique elements · composition normalized to 100 wt%</small></span></div>
                      <div className="readiness-item pass"><CheckCircle2 size={16} /><span><strong>48 states calculated</strong><small>{studyTempMin}–{studyTempMax} °C · 1 bar reference</small></span></div>
                      <div className="readiness-item pass"><CheckCircle2 size={16} /><span><strong>Local-only execution</strong><small>0 remote requests · 0 API tokens · deterministic model v{studyResult.engine.version}</small></span></div>
                    </div>

                    <div className="local-result-kpis">
                      <div><span>Estimated solidus</span><strong>{studyResult.summary.estimatedSolidusC.toFixed(0)} °C</strong></div>
                      <div><span>Estimated liquidus</span><strong>{studyResult.summary.estimatedLiquidusC.toFixed(0)} °C</strong></div>
                      <div><span>Mixing ΔG proxy</span><strong>{studyResult.summary.gibbsMixAtMidpointKJMol.toFixed(2)} kJ/mol</strong></div>
                      <div><span>Dominant midpoint tendency</span><strong>{studyResult.summary.dominantPhase}</strong></div>
                    </div>

                    <div className="local-study-chart">
                      <div className="local-result-heading"><div><span className="eyebrow">Phase screening</span><h3>Estimated phase weights vs temperature</h3></div><span>48 local points</span></div>
                      <div className="chart-wrap">
                        <PhaseChart data={studyResult.points} phases={studyResult.phases} temperatureMin={studyTempMin} temperatureMax={studyTempMax} systemName={studyResult.system} />
                      </div>
                      <div className="phase-legend local-phase-legend">
                        {studyResult.phases.map((phase) => <div key={phase.key}><span style={{ backgroundColor: phase.color }} /><p><strong>{phase.label}</strong><small>Local screening weight</small></p></div>)}
                      </div>
                    </div>

                    <div className="local-screening-grid">
                      {selectedAnalyses.includes("intermetallic") && <div><span>Intermetallic tendency</span><strong>{studyResult.summary.intermetallicRisk}</strong><em>{studyResult.summary.intermetallicIndex.toFixed(1)} / 100</em></div>}
                      {selectedAnalyses.includes("tcp") && <div><span>TCP tendency</span><strong>{studyResult.summary.tcpRisk}</strong><em>{studyResult.summary.tcpIndex.toFixed(1)} / 100</em></div>}
                      {selectedAnalyses.includes("solubility") && <div><span>Solid-solution index</span><strong>{studyResult.summary.solidSolutionIndex.toFixed(1)}</strong><em>higher favors solution phases</em></div>}
                      {selectedAnalyses.includes("sfe") && <div><span>SFE screening index</span><strong>{studyResult.summary.sfeIndexAtMidpoint.toFixed(1)}</strong><em>unitless · not mJ/m²</em></div>}
                      {selectedAnalyses.includes("gibbs-energy") && <div><span>Ideal mixing entropy</span><strong>{studyResult.summary.mixingEntropyJMolK.toFixed(2)}</strong><em>J/mol·K</em></div>}
                      {selectedAnalyses.includes("phase-stability") && <div><span>Weighted melting point</span><strong>{studyResult.summary.weightedMeltingPointC.toFixed(0)} °C</strong><em>composition-weighted estimate</em></div>}
                    </div>

                    <div className="no-result-notice local-model-notice"><ShieldCheck size={18} /><p><strong>Local calculation completed—not CALPHAD.</strong>These numerical values are deterministic engineering-screening estimates. A licensed assessed database is still required only when you need certified equilibrium accuracy.</p></div>
                    <div className="study-readiness-actions">
                      <button className="study-export-button" onClick={exportLocalStudyJson}><Download size={16} /> Export result JSON</button>
                      <button className="study-coverage-button" onClick={exportLocalStudyCsv}><Download size={16} /> Export result CSV</button>
                    </div>
                    <span className="download-toast lab-download-status" role="status" aria-live="polite">{downloadMessage}</span>
                  </div>
                )}
              </section>
            </section>
          ) : (
            <section className="research-layout">
              <section className="pipeline-map panel">
                <div className="lab-section-heading"><div><span className="eyebrow">Evidence architecture</span><h2>Research-to-database pipeline</h2></div><span className="component-count">Human-reviewed</span></div>
                <div className="pipeline-stages" aria-label="Evidence ingestion stages">
                  {["Discover", "Extract", "Normalize", "Human review", "Versioned release"].map((stage, index) => (
                    <div className="pipeline-stage-wrap" key={stage}>
                      <div className="pipeline-step"><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong><small>{["API, DOI or registry", "Structured fields + evidence", "Units, phases, composition", "Source and uncertainty check", "Hash, license and provenance"][index]}</small></div>
                      {index < 4 && <span className="pipeline-connector" aria-hidden="true">→</span>}
                    </div>
                  ))}
                </div>
                <div className="pipeline-rule"><Sparkles size={18} /><p><strong>Machine learning proposes; reviewers promote.</strong>Automated extraction may create a candidate record, but only a cited, licensed, unit-normalized and human-reviewed record can enter a released dataset.</p></div>
              </section>

              <section className="source-registry-grid" aria-label="Research source registry">
                {researchSources.map((source) => (
                  <a className="research-source-card" key={source.name} href={source.href} target="_blank" rel="noreferrer">
                    <span><Database size={15} /> Registered source</span>
                    <h3>{source.name}</h3>
                    <p>{source.scope}</p>
                    <strong>{source.access} ↗</strong>
                  </a>
                ))}
              </section>

              <section className="curation-panel panel">
                <div className="lab-section-heading"><div><span className="eyebrow">Candidate intake</span><h2>Build an evidence queue</h2></div><span className="component-count">{curationJobs.length} candidates</span></div>
                <p className="section-intro">This local queue demonstrates the workflow contract. It does not download paywalled text or automatically accept extracted scientific claims.</p>
                <div className="curation-form">
                  <label><span>Source</span><select value={researchSource} onChange={(event) => setResearchSource(event.target.value)}>{researchSources.map((source) => <option key={source.name}>{source.name}</option>)}</select></label>
                  <label><span>DOI, URL or record ID</span><input aria-label="DOI, URL or record ID" placeholder="10.xxxx/… or source record" value={researchIdentifier} onChange={(event) => setResearchIdentifier(event.target.value)} /></label>
                  <label><span>Property family</span><select value={researchProperty} onChange={(event) => setResearchProperty(event.target.value)}>{["Phase equilibria", "Gibbs energy", "Solubility", "Stacking-fault energy", "Intermetallic / TCP phases", "Thermophysical property"].map((property) => <option key={property}>{property}</option>)}</select></label>
                  <button onClick={addCurationJob} disabled={!researchIdentifier.trim()}><Plus size={16} /> Add candidate</button>
                </div>

                <div className="curation-content">
                  <div className="curation-queue">
                    <h3>Review queue</h3>
                    {curationJobs.length === 0 ? (
                      <div className="queue-empty"><FileSearch size={24} /><strong>No candidate records yet</strong><p>Add a DOI, public API identifier, or source URL to create a reviewable placeholder.</p></div>
                    ) : curationJobs.map((job) => (
                      <article className="curation-job" key={job.id}>
                        <div><span>{job.source}</span><strong>{job.identifier}</strong><small>{job.system} · {job.property}</small></div>
                        <em>{job.stage}</em>
                        <button aria-label={`Remove ${job.identifier}`} onClick={() => setCurationJobs((current) => current.filter((item) => item.id !== job.id))}><Trash2 size={15} /></button>
                      </article>
                    ))}
                  </div>
                  <div className="schema-fields">
                    <h3>Required evidence record</h3>
                    <dl>
                      <div><dt>Identity</dt><dd>DOI / source ID, title, authors, year</dd></div>
                      <div><dt>System</dt><dd>Elements, composition basis and exact values</dd></div>
                      <div><dt>Conditions</dt><dd>Temperature, pressure and processing history</dd></div>
                      <div><dt>Observation</dt><dd>Value, unit, uncertainty and method</dd></div>
                      <div><dt>Phase evidence</dt><dd>Identity, constitution and interpretation split</dd></div>
                      <div><dt>Governance</dt><dd>License, reviewer, content hash and version</dd></div>
                    </dl>
                  </div>
                </div>
              </section>
            </section>
          )}
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
              <div><strong>{sources.length}</strong><span>public references</span></div>
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
                  <button aria-pressed={dataMode === "elements"} className={dataMode === "elements" ? "active" : ""} onClick={() => switchDataMode("elements")}><Atom size={15} /> Elements</button>
                  <button aria-pressed={dataMode === "alloys"} className={dataMode === "alloys" ? "active" : ""} onClick={() => switchDataMode("alloys")}><Layers3 size={15} /> Alloy presets</button>
                </div>
                <div className="search-field">
                  <Search size={17} />
                  <input aria-label={t.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
                  {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
                </div>
              </div>

              <div className="pack-context" role="status">
                <span>{selectedPack.code}</span>
                <div className="pack-context-copy">
                  <p><strong>{selectedPack.title}</strong><small>{selectedPack.models} illustrative models · {selectedPack.phases} displayed phases · {selectedPack.status}</small></p>
                  <dl className="pack-detail-grid">
                    <div><dt>Components</dt><dd>{selectedPack.components}</dd></div>
                    <div><dt>Illustrative input domain</dt><dd>{selectedPack.validity}</dd></div>
                    <div><dt>Capabilities</dt><dd>{selectedPack.capabilities}</dd></div>
                    <div><dt>Implementation lineage</dt><dd>{selectedPack.provenance}</dd></div>
                  </dl>
                </div>
              </div>

              {dataMode === "elements" ? (
                <>
                  <div className="catalog-intro"><p><strong>{elementCatalogStatus === "ready" ? `${filteredElements.length} ${filteredElements.length === 1 ? "element" : "elements"}` : "Element catalog"}</strong>Open periodic reference catalog</p><span>periodic-table 0.0.8 · ISC license</span></div>
                  {elementCatalogStatus === "idle" || elementCatalogStatus === "loading" ? (
                    <div className="catalog-loading" role="status"><span className="spinner" /><h3>Loading the element catalog…</h3><p>The calculation workspace stays lightweight until this data is needed.</p></div>
                  ) : elementCatalogStatus === "error" ? (
                    <div className="empty-state"><Info size={22} /><h3>The element catalog did not load</h3><p>Your calculation data is safe. Retry this section without reloading the app.</p><button onClick={() => { setElementCatalogStatus("idle"); setCatalogRetry((value) => value + 1); }}>Retry catalog</button></div>
                  ) : filteredElements.length === 0 ? (
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
                          <button className="use-alloy-button" onClick={() => exploreAlloyInWorkspace(alloy.name)}>Explore simplified binary →</button>
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

      {view === "coverage" && (
        <main className="coverage-page">
          <section className="coverage-hero">
            <div>
              <span className="eyebrow"><Microscope size={15} /> Audited against Thermo-Calc</span>
              <h1>Useful parity, without false equivalence.</h1>
              <p>Iran ThermoCalc now exposes exactly what works, what is a transparent educational proxy, and what still requires an assessed CALPHAD database or specialist solver. It does not copy proprietary parameters.</p>
              <div className="coverage-actions">
                <button onClick={() => setView("workspace")}><Play size={16} /> Try the calculators</button>
                <button className="secondary" onClick={() => setView("lab")}><Workflow size={16} /> Build a 2–6 component study</button>
                <button className="secondary" onClick={() => setView("database")}><Database size={16} /> Inspect the data</button>
              </div>
            </div>
            <div className="coverage-kpis" aria-label="Iran ThermoCalc coverage summary">
              <div><strong>4</strong><span>interactive local calculation workflows</span></div>
              <div><strong>6</strong><span>transparent binary systems</span></div>
              <div><strong>118</strong><span>element records</span></div>
              <div><strong>0</strong><span>proprietary datasets copied</span></div>
            </div>
          </section>

          <section className="benchmark-section panel">
            <div className="benchmark-heading">
              <div><span className="eyebrow">Feature benchmark</span><h2>Capability-by-capability comparison</h2></div>
              <a href="https://thermocalc.com/products/thermo-calc/" target="_blank" rel="noreferrer">Official product reference ↗</a>
            </div>
            <div className="benchmark-table-wrap">
              <table className="benchmark-table">
                <thead><tr><th>Capability</th><th>Thermo-Calc reference</th><th>Iran ThermoCalc today</th><th>Status</th></tr></thead>
                <tbody>
                  {capabilityBenchmark.map((row) => (
                    <tr key={row.capability}>
                      <th scope="row">{row.capability}</th>
                      <td>{row.official}</td>
                      <td>{row.iran}</td>
                      <td><span className={`status-badge ${row.status}`}>{row.status === "proxy" ? "Educational proxy" : row.status === "roadmap" ? "Roadmap" : row.status === "missing" ? "Not implemented" : "Solver + assessed data required"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="database-gap-grid">
            <article className="database-gap-card available">
              <span>Available now</span><h2>Transparent educational layer</h2>
              <ul><li>6 readable heuristic phase-system functions</li><li>Single state, one-axis, and cooling-path proxy</li><li>118-element reference catalog and 24 alloy presets</li><li>CSV and warning-bearing JSON exports</li></ul>
            </article>
            <article className="database-gap-card required">
              <span>Required for engineering</span><h2>Assessed CALPHAD layer</h2>
              <ul><li>Local multicomponent screening engine is bundled</li><li>0 licensed TDB parameter sets currently bundled</li><li>No assessed multicomponent Gibbs-energy minimizer</li><li>No diffusion, precipitation, aqueous, or process solver</li></ul>
            </article>
            <article className="database-gap-card path">
              <span>Best next architecture</span><h2>Open solver integration</h2>
              <ul><li>pycalphad calculation service behind the UI</li><li>Licensed or openly assessed TDB inputs</li><li>Record-level provenance, version, and validity</li><li>Regression suite against published reference cases</li></ul>
            </article>
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
              <p>Set temperature, pressure, composition and calculation path. The prototype implements single-state, one-axis and cooling-path proxy calculations for six representative binary systems.</p>
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
            <div><h2>What is production-ready—and what is not</h2><p>The application, interaction model, responsive UI, catalogs and exports are functional. The six phase models and all three calculation paths are educational approximations for product validation; they must be replaced or verified with assessed CALPHAD parameters before engineering use.</p></div>
            <button onClick={() => setView("workspace")}>Open workspace</button>
          </section>
        </main>
      )}
    </div>
  );
}
