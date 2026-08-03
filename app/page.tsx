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
  Timer,
  Trash2,
  Workflow,
  Zap,
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
    system: "Phase system",
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
    system: "سامانه فازی",
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
  { id: "solidification", label: "Solidification", description: "Cooling-path calculation" },
];

const capabilityBenchmark = [
  { capability: "Single equilibrium", official: "Built-in calculator", iran: "Single-state phase-weight estimate", status: "proxy" },
  { capability: "One-axis calculation", official: "Built-in calculator", iran: "Temperature sweep · plot, table and exports", status: "proxy" },
  { capability: "Multicomponent system definition", official: "Arbitrary components with assessed databases", iran: "Working 2–6 component calculation engine", status: "proxy" },
  { capability: "Grid calculation", official: "Built-in calculator", iran: "Roadmap", status: "roadmap" },
  { capability: "Phase diagram", official: "Built-in calculator", iran: "Estimated phase-weight windows", status: "proxy" },
  { capability: "Solidification", official: "Scheil / back-diffusion workflows", iran: "Cooling-path phase calculation", status: "proxy" },
  { capability: "Physical properties", official: "Temperature-dependent model libraries", iran: "Density, Cp, expansion and thermal conductivity", status: "proxy" },
  { capability: "Mechanical properties", official: "Strength, modulus, flow and hardness models", iran: "Young's modulus, yield strength and hardness", status: "proxy" },
  { capability: "TTT / CCT transformations", official: "Transformation diagrams and properties", iran: "Cooling-time and transformation indices", status: "proxy" },
  { capability: "Custom cooling profiles", official: "Solidification and cooling profiles", iran: "Cooling rate, grain size and strain-rate inputs", status: "proxy" },
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
  { id: "phase-diagram", label: "Phase diagram", faLabel: "نمودار فازی", detail: "Estimated phase-weight windows", faDetail: "بازه‌های تخمینی سهم فازها", requirement: "Structure-tendency model", faRequirement: "مدل گرایش ساختاری" },
  { id: "gibbs-energy", label: "Mixing energy", faLabel: "انرژی اختلاط", detail: "Ideal entropy + pair-interaction estimate", faDetail: "آنتروپی ایده‌آل و برهم‌کنش دوتایی", requirement: "Deterministic estimate", faRequirement: "برآورد قطعی" },
  { id: "phase-stability", label: "Phase stability", faLabel: "پایداری فاز", detail: "Estimated phase tendency ranking", faDetail: "رتبه‌بندی گرایش فازها", requirement: "Structure screening", faRequirement: "غربالگری ساختاری" },
  { id: "sfe", label: "SFE screening", faLabel: "غربالگری انرژی نقص چیدمان", detail: "Unitless stacking-fault tendency index", faDetail: "شاخص بدون‌بُعد گرایش نقص چیدمان", requirement: "Screening index", faRequirement: "شاخص غربالگری" },
  { id: "solubility", label: "Solid-solution tendency", faLabel: "گرایش محلول جامد", detail: "Competition with ordered and TCP phases", faDetail: "رقابت با فازهای منظم و TCP", requirement: "Competition model", faRequirement: "مدل رقابتی" },
  { id: "intermetallic", label: "Intermetallics", faLabel: "بین‌فلزی‌ها", detail: "Ordered-compound tendency screening", faDetail: "غربالگری ترکیبات منظم", requirement: "Composition-pair model", faRequirement: "مدل جفت‌عنصری" },
  { id: "tcp", label: "TCP phases", faLabel: "فازهای TCP", detail: "σ, μ and Laves family risk screening", faDetail: "غربالگری ریسک فازهای سیگما، مو و لاوس", requirement: "Refractory/matrix model", faRequirement: "مدل عناصر دیرگداز و زمینه" },
  { id: "physical-properties", label: "Physical properties", faLabel: "خواص فیزیکی", detail: "Density, heat capacity and conductivity", faDetail: "چگالی، ظرفیت گرمایی و رسانایی", requirement: "Temperature sweep", faRequirement: "پویش دمایی" },
  { id: "mechanical-properties", label: "Mechanical properties", faLabel: "خواص مکانیکی", detail: "Modulus, yield strength and hardness", faDetail: "مدول، تنش تسلیم و سختی", requirement: "Temperature + strain rate", faRequirement: "دما و نرخ کرنش" },
  { id: "transformations", label: "Cooling transformations", faLabel: "تحولات حین سرمایش", detail: "Cooling time and transformation indices", faDetail: "زمان سرمایش و شاخص‌های تحول", requirement: "Cooling profile", faRequirement: "پروفایل سرمایش" },
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
  const [studyCoolingRate, setStudyCoolingRate] = useState(10);
  const [studyGrainSize, setStudyGrainSize] = useState(50);
  const [studyStrainRate, setStudyStrainRate] = useState(0.1);
  const [newElementSymbol, setNewElementSymbol] = useState("C");
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>(analysisTargets.map((target) => target.id));
  const [studyResult, setStudyResult] = useState<LocalStudyResult | null>(null);
  const [isStudyRunning, setIsStudyRunning] = useState(false);
  const [researchSource, setResearchSource] = useState(researchSources[0].name);
  const [researchIdentifier, setResearchIdentifier] = useState("");
  const [researchProperty, setResearchProperty] = useState("Phase equilibria");
  const [curationJobs, setCurationJobs] = useState<CurationJob[]>([]);

  const t = copy[language];
  const l = (english: string, persian: string) => language === "fa" ? persian : english;
  const system = systems.find((item) => item.id === systemId) ?? systems[0];
  const resultSystem = systems.find((item) => item.id === runConfig.systemId) ?? systems[0];
  const selectedPack = dataPacks.find((item) => item.code === selectedPackCode) ?? dataPacks[0];
  const fixedCompositionTotal = studyComponents.filter((item) => !item.balance).reduce((sum, item) => sum + item.wtPercent, 0);
  const balanceComposition = Math.max(0, 100 - fixedCompositionTotal);
  const invalidStudy = studyComponents.length < 2 || studyComponents.length > 6 || fixedCompositionTotal >= 100 || studyTempMin >= studyTempMax || studyCoolingRate <= 0 || studyGrainSize <= 0 || studyStrainRate <= 0;
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
      setStudyResult(runLocalMulticomponentStudy(components, elements, studyTempMin, studyTempMax, {
        coolingRateKPerS: studyCoolingRate,
        grainSizeMicron: studyGrainSize,
        strainRatePerS: studyStrainRate,
      }));
      setIsStudyRunning(false);
    }, 260);
  };

  const exportLocalStudyJson = () => {
    if (!studyResult) return;
    const artifact = {
      product: "Iran ThermoCalc",
      exportVersion: "multicomponent-study-1.0",
      exportedAt: new Date().toISOString(),
      warning: "Engineering model estimate; validate critical decisions against qualified reference data.",
      requestedAnalyses: analysisTargets.filter((item) => selectedAnalyses.includes(item.id)),
      result: studyResult,
    };
    downloadBlob(new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json;charset=utf-8" }), `iran-thermocalc-${studyResult.system.toLowerCase()}-result.json`);
  };

  const exportLocalStudyCsv = () => {
    if (!studyResult) return;
    const rows = [
      "temperature_c,liquid,fcc,bcc,hcp,intermetallic,tcp,gibbs_mix_kj_mol,sfe_index,density_kg_m3,specific_heat_j_kg_k,thermal_conductivity_w_m_k,thermal_expansion_microstrain_k,youngs_modulus_gpa,yield_strength_mpa,hardness_hv",
      ...studyResult.points.map((point, index) => {
        const property = studyResult.properties[index];
        return [point.temperature, point.liquid, point.fcc, point.bcc, point.hcp, point.intermetallic, point.tcp, point.gibbsMixKJMol, point.sfeIndex, property.densityKgM3, property.specificHeatJKgK, property.thermalConductivityWMK, property.thermalExpansionMicrostrainK, property.youngsModulusGPa, property.yieldStrengthMPa, property.hardnessHV].join(",");
      }),
    ];
    downloadBlob(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), `iran-thermocalc-${studyResult.system.toLowerCase()}-result.csv`);
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
      applicationVersion: "1.0.0",
      warning: "Engineering model estimate; validate critical production decisions against qualified reference data.",
      calculation: {
        mode: runConfig.mode,
        solidificationNotice: runConfig.mode === "solidification" ? "Temperature-sampled cooling-path calculation." : null,
        pointOrder: runConfig.mode === "solidification" ? "high-to-low temperature cooling path" : runConfig.mode === "single-point" ? "single state" : "low-to-high temperature axis",
      },
      model: {
        id: resultSystem.id,
        label: resultSystem.database,
        implementation: "engineering phase model",
        scope: resultSystem.note,
        fractionBasis: "normalized unitless heuristic weight; not mass or mole fraction",
        validity: { compositionWtPct: [0, resultSystem.maxComposition], temperatureC: [resultSystem.tempMin, resultSystem.tempMax], pressureBar: 1 },
        reviewStatus: "engineering screening model",
        sourceUrl: null,
        license: "application model code; no third-party proprietary parameters included",
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
        <button className="brand" onClick={() => setView("workspace")} aria-label={l("Iran ThermoCalc home", "صفحه اصلی ایران ترموکلک")}>
          <BrandMark />
          <span className="brand-copy">
            <strong>Iran ThermoCalc</strong>
            <small>{l("Materials engineering platform", "سامانه مهندسی مواد")}</small>
          </span>
        </button>

        <nav className="primary-nav" aria-label={l("Primary navigation", "راهبری اصلی")}>
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
          <span className="prototype-pill"><span /> {l("Version 1.0", "نسخه ۱٫۰")}</span>
          <button
            className="icon-text-button"
            onClick={() => setLanguage(language === "en" ? "fa" : "en")}
            aria-label={l("Switch to Persian", "تغییر زبان به انگلیسی")}
          >
            <Languages size={17} /> {language === "en" ? "فارسی" : "English"}
          </button>
          <button className="round-button" onClick={() => setView("method")} aria-label={l("Help and documentation", "راهنما و مستندات")}>
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <div className="trust-strip">
        <ShieldCheck size={15} />
          <span>{l("Independent materials engineering platform", "سامانه مستقل مهندسی مواد")}</span>
          <span className="trust-strip-end">{l("SI units · traceable exports · transparent models", "واحدهای SI · خروجی قابل‌ردیابی · مدل‌های شفاف")}</span>
      </div>

      {view === "workspace" && (
        <main className="workspace-grid">
          <aside className="project-panel panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{t.projects}</span>
                <h2>{l("Alloy study 01", "مطالعه آلیاژ ۰۱")}</h2>
              </div>
              <button
                type="button"
                className="quiet-icon"
                aria-label={projectPanelOpen ? l("Collapse project flow", "بستن روند پروژه") : l("Expand project flow", "بازکردن روند پروژه")}
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
                  <span><small>01</small><strong>{l("System definition", "تعریف سامانه")}</strong><em>{system.database}</em></span>
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
                  <span><small>02</small><strong>{l("Calculation path", "مسیر محاسبه")}</strong><em>{calculatorMode === "one-axis" ? l("One-axis", "تک‌محوره") : calculatorMode === "single-point" ? l("Single point", "تک‌نقطه") : l("Solidification", "انجماد")}</em></span>
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
                  <span><small>03</small><strong>{l("Plot", "نمودار")}</strong><em>{runConfig.mode === "single-point" ? l("Phase-weight bars", "میله‌های سهم فاز") : l("Phase weights / T", "سهم فاز / دما")}</em></span>
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
                  <span><small>04</small><strong>{l("Table", "جدول")}</strong><em>{runConfig.mode === "single-point" ? l("1 calculated state", "۱ حالت محاسبه‌شده") : l("36 calculated points", "۳۶ نقطه محاسبه‌شده")}</em></span>
                  {activeWorkflowStep === "table" && <span className="step-dot" />}
                </button>
              </div>

              <div className="project-meta">
                <div><span>{l("Engine", "موتور")}</span><strong>{l("Engineering model", "مدل مهندسی")}</strong></div>
                <div><span>{l("Last run", "آخرین اجرا")}</span><strong>{l("Run", "اجرا")} #{String(runNumber).padStart(3, "0")}</strong></div>
                <div><span>{l("State", "وضعیت")}</span><strong className="state-good">{l("Ready", "آماده")}</strong></div>
              </div>

              <div className="mini-notice">
                <Info size={16} />
                <p><strong>{l("Model confidence", "اعتبار مدل")}</strong>{l("Each result keeps its model scope and validation status visible.", "محدوده مدل و وضعیت اعتبارسنجی هر نتیجه به‌صورت شفاف نمایش داده می‌شود.")}</p>
              </div>
            </div>
          </aside>

          <section className="builder-panel panel">
            <div className="panel-heading builder-heading">
              <div>
                <span className="eyebrow">{l("Calculation setup", "تنظیم محاسبه")}</span>
                <h1>{t.system}</h1>
              </div>
              <span className={isDirty ? "saved-state dirty" : "saved-state"}>
                {isDirty ? <Info size={15} /> : <CheckCircle2 size={15} />}
                {isDirty ? l("Inputs changed", "ورودی‌ها تغییر کرده‌اند") : l("Results current", "نتایج به‌روز است")}
              </span>
            </div>

            <div className="calculator-switcher" aria-label={l("Calculation type", "نوع محاسبه")}>
              {calculatorModes.map((mode) => (
                <button
                  type="button"
                  key={mode.id}
                  aria-pressed={calculatorMode === mode.id}
                  className={calculatorMode === mode.id ? "active" : ""}
                  onClick={() => switchCalculatorMode(mode.id)}
                >
                  <span>{mode.id === "one-axis" ? l("One-axis", "تک‌محوره") : mode.id === "single-point" ? l("Single point", "تک‌نقطه") : l("Solidification", "انجماد")}</span>
                  <small>{mode.id === "one-axis" ? l("36-point temperature sweep", "پویش دما در ۳۶ نقطه") : mode.id === "single-point" ? l("Phase weights at one state", "سهم فازها در یک حالت") : l("Cooling-path calculation", "محاسبه مسیر سرمایش")}</small>
                </button>
              ))}
            </div>
            <p className={`mode-context ${calculatorMode === "solidification" ? "warning" : ""}`}>
              {calculatorMode === "one-axis" && l("Explore how calculated phase weights change with temperature.", "تغییر سهم محاسبه‌شده فازها را با دما بررسی کنید.")}
              {calculatorMode === "single-point" && l("Inspect phase weights at one temperature and composition.", "سهم فازها را در یک دما و ترکیب بررسی کنید.")}
              {calculatorMode === "solidification" && l("Evaluate phase development along a cooling path.", "تغییرات فازها را در مسیر سرمایش ارزیابی کنید.")}
            </p>

            <div className="field-group">
              <label htmlFor="system-select">{l("System & model", "سامانه و مدل")}</label>
              <div className="select-wrap">
                <select id="system-select" value={systemId} onChange={(event) => switchSystem(event.target.value)}>
                  {systems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} · {item.database}</option>
                  ))}
                </select>
                <ChevronDown size={17} />
              </div>
              <div className="field-support">
                <span className="verified-tag"><ShieldCheck size={13} /> {l("Model scope attached", "محدوده مدل مشخص است")}</span>
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
                  <div><strong>{(100 - composition).toFixed(2)}</strong><small>{l("balance", "باقیمانده")}</small></div>
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
                <span>{calculatorMode === "one-axis" ? l("One-axis", "تک‌محوره") : calculatorMode === "single-point" ? l("Single point", "تک‌نقطه") : l("Solidification", "انجماد")}</span>
              </div>
              <div className="conditions-grid">
                {calculatorMode === "single-point" ? (
                  <label className="compact-field temperature-point-field">
                    <span><Thermometer size={15} /> {l("Evaluation temperature", "دمای ارزیابی")}</span>
                    <div><input aria-invalid={invalidPoint} type="number" min={system.tempMin} max={system.tempMax} value={probeTemperature} onChange={(event) => { setProbeTemperature(Number(event.target.value)); setActiveWorkflowStep("model"); }} /><small>°C</small></div>
                  </label>
                ) : (
                  <>
                    <label className="compact-field">
                      <span><Thermometer size={15} /> {calculatorMode === "solidification" ? l("Cooling end · low", "پایان سرمایش · کم") : l("Temperature start", "دمای شروع")}</span>
                      <div><input aria-invalid={invalidRange} type="number" min={system.tempMin} max={system.tempMax} value={tempMin} onChange={(event) => { setTempMin(Number(event.target.value)); setActiveWorkflowStep("model"); }} /><small>°C</small></div>
                    </label>
                    <label className="compact-field">
                      <span><Thermometer size={15} /> {calculatorMode === "solidification" ? l("Cooling start · high", "شروع سرمایش · زیاد") : l("Temperature end", "دمای پایان")}</span>
                      <div><input aria-invalid={invalidRange} type="number" min={system.tempMin} max={system.tempMax} value={tempMax} onChange={(event) => { setTempMax(Number(event.target.value)); setActiveWorkflowStep("model"); }} /><small>°C</small></div>
                    </label>
                  </>
                )}
                <label className="compact-field">
                  <span><Gauge size={15} /> {t.pressure}</span>
                  <div><input type="number" value={pressure} disabled aria-label={l("Fixed reference pressure", "فشار مرجع ثابت")} /><small>bar · {l("fixed", "ثابت")}</small></div>
                </label>
                <div className="compact-field calculated-field">
                  <span><Layers3 size={15} /> {l("Points", "نقاط")}</span>
                  <div><strong>{calculatorMode === "single-point" ? 1 : 36}</strong><small>{l("automatic", "خودکار")}</small></div>
                </div>
              </div>
              {invalidInput && <p className="validation-error" role="alert">{calculatorMode === "single-point" ? l(`Use a temperature within ${system.tempMin}–${system.tempMax} °C.`, `دما را در بازه ${system.tempMin} تا ${system.tempMax} درجه وارد کنید.`) : l(`Use an increasing range within ${system.tempMin}–${system.tempMax} °C.`, `یک بازه افزایشی بین ${system.tempMin} تا ${system.tempMax} درجه وارد کنید.`)}</p>}
            </div>

            <div className="model-note">
              <FlaskConical size={18} />
              <p><strong>{l("Model scope", "محدوده مدل")}</strong>{l(system.note, "این مدل برای ارزیابی مهندسی رفتار فازی در محدوده ترکیب و دمای مشخص‌شده تنظیم شده است.")}</p>
            </div>

            <button className="run-button" onClick={runCalculation} disabled={isRunning || invalidInput}>
              {isRunning ? <span className="spinner" /> : <Play size={18} fill="currentColor" />}
              {isRunning ? t.calculating : isDirty ? l("Update results", "به‌روزرسانی نتایج") : calculatorMode === "single-point" ? l("Run single point", "اجرای تک‌نقطه") : calculatorMode === "solidification" ? l("Run solidification", "اجرای انجماد") : t.run}
            </button>
          </section>

          <section id="results-section" className="results-panel panel" tabIndex={-1}>
            <div className="results-header">
              <div>
                <span className="eyebrow">{t.results}</span>
                <h2>
                  {runConfig.mode === "single-point" ? l("Single-state phase weights", "سهم فازها در یک حالت") : runConfig.mode === "solidification" ? l("Solidification path", "مسیر انجماد") : l("Normalized phase weights", "سهم نرمال‌شده فازها")}
                  <span>{runConfig.mode === "single-point" ? l(` at ${runConfig.probeTemperature} °C`, ` در ${runConfig.probeTemperature} درجه`) : l(" versus temperature", " برحسب دما")}</span>
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
              <div><span>{l("System", "سامانه")}</span><strong>{resultSystem.name}</strong></div>
              <div><span>{l("Composition", "ترکیب")}</span><strong>{runConfig.composition.toFixed(2)} wt% {resultSystem.solute}</strong></div>
              <div><span>{runConfig.mode === "single-point" ? l("State", "حالت") : l("Range", "بازه")}</span><strong>{runConfig.mode === "single-point" ? `${runConfig.probeTemperature} °C` : `${runConfig.tempMin}–${runConfig.tempMax} °C`}</strong></div>
              <div><span>{l("Basis", "مبنا")}</span><strong>{l("Normalized phase weight", "سهم نرمال‌شده فاز")}</strong></div>
            </div>

            {isDirty && (
              <div className="stale-banner" role="status">
                <Info size={16} />
                <span><strong>{l("Results use the previous inputs.", "نتایج مربوط به ورودی‌های قبلی است.")}</strong> {l("Run the calculation to refresh.", "برای به‌روزرسانی محاسبه را اجرا کنید.")}</span>
                <button onClick={runCalculation} disabled={invalidInput}>{l("Refresh now", "به‌روزرسانی")}</button>
              </div>
            )}

            {runConfig.mode === "solidification" && solidificationMetrics && (
              <div className="solidification-metrics">
                <div><span>{l("First solid >1%", "آغاز جامدشدن بیش از ۱٪")}</span><strong>{solidificationMetrics.firstSolid === null ? l("Outside range", "خارج از بازه") : `≈ ${solidificationMetrics.firstSolid.toFixed(0)} °C`}</strong></div>
                <div><span>{l("Solid ≥99%", "جامد ≥۹۹٪")}</span><strong>{solidificationMetrics.nearlySolid === null ? l("Outside range", "خارج از بازه") : `≈ ${solidificationMetrics.nearlySolid.toFixed(0)} °C`}</strong></div>
                <div><span>{l("Solidification window", "بازه انجماد")}</span><strong>{solidificationMetrics.interval === null ? "—" : `≈ ${solidificationMetrics.interval.toFixed(0)} °C`}</strong></div>
                <div><span>{l("Solid at cooling end", "جامد در پایان سرمایش")}</span><strong>{(solidificationMetrics.solidAtMinimum * 100).toFixed(1)}%</strong></div>
                <p><Info size={14} /> {l(`Cooling path sampled from high to low temperature with ΔT ≈ ${solidificationMetrics.sampleSpacing.toFixed(1)} °C.`, `مسیر سرمایش از دمای زیاد به کم با گام تقریبی ${solidificationMetrics.sampleSpacing.toFixed(1)} درجه نمونه‌برداری شده است.`)}</p>
              </div>
            )}

            {runConfig.mode === "single-point" ? (
              <div className="point-result" aria-label={`Phase weights at ${runConfig.probeTemperature} degrees Celsius`}>
                <div className="point-temperature-card">
                  <Thermometer size={22} />
                  <span>{l("Calculated model output", "خروجی محاسبه‌شده مدل")}</span>
                  <strong>{runConfig.probeTemperature} °C</strong>
                  <small>{runConfig.pressure} bar · {l("reference pressure", "فشار مرجع")}</small>
                </div>
                <div className="point-phase-list">
                  {resultSystem.phases.map((phase) => {
                    const fraction = pointResult[phase.key] ?? 0;
                    const state = fraction >= 0.01 ? l("present", "موجود") : fraction > 0 ? l("trace", "جزئی") : l("not present", "ناموجود");
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
                  <thead><tr><th>{l("Temperature", "دما")}</th>{resultSystem.phases.map((phase) => <th key={phase.key}>{phase.label}</th>)}</tr></thead>
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
                <div key={phase.key}><span style={{ backgroundColor: phase.color }} /><p><strong>{phase.label}</strong><small>{l("Normalized phase weight", "سهم نرمال‌شده فاز")}</small></p></div>
              ))}
            </div>}

            <div className="confidence-bar">
              <ShieldCheck size={17} />
              <p><strong>{l("Model confidence", "اعتبار مدل")}</strong><span>{l("Engineering estimate · validate critical production decisions", "برآورد مهندسی · تصمیم‌های حساس تولید را اعتبارسنجی کنید")}</span></p>
              <button onClick={() => setView("method")}>{l("View methodology", "مشاهده روش‌شناسی")}</button>
            </div>
          </section>
        </main>
      )}

      {view === "lab" && (
        <main className="lab-page">
          <section className="lab-hero">
            <div className="lab-hero-copy">
              <span className="eyebrow"><Workflow size={15} /> {l("Advanced alloy calculations", "محاسبات پیشرفته آلیاژ")}</span>
              <h1>{l("Multicomponent materials engineering in one workspace.", "مهندسی مواد چندجزئی در یک محیط یکپارچه.")}</h1>
              <p>{l("Calculate phase behaviour, physical and mechanical properties, solidification and cooling transformations for 2–6 component alloys.", "رفتار فازی، خواص فیزیکی و مکانیکی، انجماد و تحولات سرمایشی آلیاژهای ۲ تا ۶ جزئی را محاسبه کنید.")}</p>
              <div className="lab-mode-switch" aria-label={l("Multicomponent lab mode", "حالت آزمایشگاه چندجزئی")}>
                <button aria-pressed={labMode === "study"} className={labMode === "study" ? "active" : ""} onClick={() => setLabMode("study")}><FlaskConical size={16} /> {l("Calculation", "محاسبه")}</button>
                <button aria-pressed={labMode === "research"} className={labMode === "research" ? "active" : ""} onClick={() => setLabMode("research")}><FileSearch size={16} /> {l("Data curation", "گردآوری داده")}</button>
              </div>
            </div>
          </section>

          {labMode === "study" ? (
            <section className="study-layout">
              <section className="study-builder panel">
                <div className="lab-section-heading">
                  <div><span className="eyebrow">{l("01 · Define", "۰۱ · تعریف")}</span><h2>{l("System composition", "ترکیب سامانه")}</h2></div>
                  <span className="component-count">{studyComponents.length} / 6 {l("components", "جزء")}</span>
                </div>

                <label className="lab-field" htmlFor="study-template">
                  <span>{l("Starting template", "الگوی اولیه")}</span>
                  <select id="study-template" value={selectedTemplateId} onChange={(event) => applyStudyTemplate(event.target.value)}>
                    {studyTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.family}</option>)}
                  </select>
                </label>

                <div className="composition-editor" aria-label={l("Study composition in weight percent", "ترکیب مطالعه برحسب درصد وزنی")}>
                  <div className="composition-editor-head"><span>{l("Element", "عنصر")}</span><span>{l("Composition", "ترکیب")}</span><span>{l("Action", "عملیات")}</span></div>
                  {studyComponents.map((component) => {
                    const element = elementBySymbol.get(component.symbol);
                    return (
                      <div className="composition-row" key={component.symbol}>
                        <div className="component-symbol"><strong>{component.symbol}</strong><span>{element?.name ?? "Element"}</span></div>
                        {component.balance ? (
                          <output className="composition-value"><strong>{balanceComposition.toFixed(2)}</strong><span>{l("wt% · balance", "درصد وزنی · باقیمانده")}</span></output>
                        ) : (
                          <label className="composition-input">
                            <span className="sr-only">{component.symbol} composition</span>
                            <input aria-label={`${component.symbol} composition in weight percent`} type="number" min="0" max="99.99" step="0.1" value={component.wtPercent} onChange={(event) => updateStudyComponent(component.symbol, Number(event.target.value))} />
                            <small>wt%</small>
                          </label>
                        )}
                        {component.balance ? <span className="balance-pill">{l("Dependent", "وابسته")}</span> : <button className="remove-component" aria-label={`${l("Remove", "حذف")} ${component.symbol}`} onClick={() => removeStudyComponent(component.symbol)} disabled={studyComponents.length <= 2}><Trash2 size={15} /></button>}
                      </div>
                    );
                  })}
                </div>

                <div className="add-component-row">
                  <label>
                    <span className="sr-only">{l("Element to add", "عنصر جدید")}</span>
                    <select aria-label={l("Element to add", "عنصر جدید")} value={newElementSymbol} onChange={(event) => setNewElementSymbol(event.target.value)} disabled={studyComponents.length >= 6 || elements.length === 0}>
                      {elements.length === 0
                        ? <option value={newElementSymbol}>{elementCatalogStatus === "error" ? l("Element catalog unavailable", "فهرست عناصر در دسترس نیست") : l("Loading element catalog…", "در حال بارگذاری عناصر…")}</option>
                        : availableStudyElements.map((element) => <option key={element.atomicNumber} value={element.symbol}>{element.symbol} · {element.name}</option>)}
                    </select>
                  </label>
                  <button onClick={addStudyComponent} disabled={studyComponents.length >= 6 || !newElementSymbol || elements.length === 0}><Plus size={16} /> {l("Add component", "افزودن جزء")}</button>
                </div>
                {elementCatalogStatus === "error" && <button className="catalog-retry" onClick={() => { setElementCatalogStatus("idle"); setCatalogRetry((value) => value + 1); }}>Retry element catalog</button>}

                <div className={`study-total ${invalidStudy ? "invalid" : ""}`} role="status">
                  <div><span>{l("Specified", "تعیین‌شده")}</span><strong>{fixedCompositionTotal.toFixed(2)} wt%</strong></div>
                  <div><span>{studyComponents.find((item) => item.balance)?.symbol} {l("balance", "باقیمانده")}</span><strong>{balanceComposition.toFixed(2)} wt%</strong></div>
                  <div><span>{l("Total", "مجموع")}</span><strong>{(fixedCompositionTotal + balanceComposition).toFixed(2)} wt%</strong></div>
                </div>
                {fixedCompositionTotal >= 100 && <p className="validation-error" role="alert">{l("Specified components must total less than 100 wt% so the balance element remains positive.", "مجموع اجزای تعیین‌شده باید کمتر از ۱۰۰ درصد وزنی باشد.")}</p>}

                <div className="study-conditions">
                  <label><span><Thermometer size={15} /> {l("Temperature start", "دمای شروع")}</span><div><input aria-label={l("Study minimum temperature", "کمینه دمای مطالعه")} type="number" value={studyTempMin} onChange={(event) => { setStudyTempMin(Number(event.target.value)); setStudyResult(null); }} /><small>°C</small></div></label>
                  <label><span><Thermometer size={15} /> {l("Temperature end", "دمای پایان")}</span><div><input aria-label={l("Study maximum temperature", "بیشینه دمای مطالعه")} type="number" value={studyTempMax} onChange={(event) => { setStudyTempMax(Number(event.target.value)); setStudyResult(null); }} /><small>°C</small></div></label>
                  <div><span><Gauge size={15} /> {l("Pressure", "فشار")}</span><strong>1 bar</strong><small>{l("reference", "مرجع")}</small></div>
                  <label><span><Thermometer size={15} /> {l("Cooling rate", "نرخ سرمایش")}</span><div><input aria-label={l("Cooling rate", "نرخ سرمایش")} min="0.01" type="number" value={studyCoolingRate} onChange={(event) => { setStudyCoolingRate(Number(event.target.value)); setStudyResult(null); }} /><small>K/s</small></div></label>
                  <label><span><Layers3 size={15} /> {l("Grain size", "اندازه دانه")}</span><div><input aria-label={l("Grain size", "اندازه دانه")} min="1" type="number" value={studyGrainSize} onChange={(event) => { setStudyGrainSize(Number(event.target.value)); setStudyResult(null); }} /><small>µm</small></div></label>
                  <label><span><Gauge size={15} /> {l("Strain rate", "نرخ کرنش")}</span><div><input aria-label={l("Strain rate", "نرخ کرنش")} min="0.0001" step="0.01" type="number" value={studyStrainRate} onChange={(event) => { setStudyStrainRate(Number(event.target.value)); setStudyResult(null); }} /><small>s⁻¹</small></div></label>
                </div>
                {studyTempMin >= studyTempMax && <p className="validation-error" role="alert">{l("Temperature end must be higher than temperature start.", "دمای پایان باید بیشتر از دمای شروع باشد.")}</p>}
              </section>

              <section className="analysis-contract panel">
                <div className="lab-section-heading">
                  <div><span className="eyebrow">{l("02 · Analysis", "۰۲ · تحلیل")}</span><h2>{l("Calculation modules", "ماژول‌های محاسباتی")}</h2></div>
                  <span className="component-count">{selectedAnalyses.length} {l("selected", "انتخاب")}</span>
                </div>
                <p className="section-intro">{l("Select the phase, physical, mechanical and transformation outputs required for this alloy study.", "خروجی‌های فازی، فیزیکی، مکانیکی و تحولات موردنیاز این مطالعه آلیاژی را انتخاب کنید.")}</p>
                <div className="analysis-target-grid">
                  {analysisTargets.map((target) => {
                    const selected = selectedAnalyses.includes(target.id);
                    return (
                      <button key={target.id} aria-pressed={selected} className={selected ? "active" : ""} onClick={() => toggleAnalysisTarget(target.id)}>
                        <span>{selected ? <CheckCircle2 size={17} /> : <span className="target-empty" />}</span>
                        <strong>{language === "fa" ? target.faLabel : target.label}</strong>
                        <small>{language === "fa" ? target.faDetail : target.detail}</small>
                        <em>{language === "fa" ? target.faRequirement : target.requirement}</em>
                      </button>
                    );
                  })}
                </div>

                <button className="validate-study-button" disabled={invalidStudy || selectedAnalyses.length === 0 || elements.length === 0 || isStudyRunning} onClick={runLocalStudy}>
                  {isStudyRunning ? <span className="spinner" /> : <Play size={17} fill="currentColor" />} {isStudyRunning ? l("Calculating…", "در حال محاسبه…") : l("Run calculation", "اجرای محاسبه")}
                </button>

                {!studyResult ? (
                  <div className="preflight-card">
                    <Gauge size={20} />
                    <div><strong>{elements.length === 0 ? l("Loading element data…", "در حال بارگذاری داده عناصر…") : l("Ready to calculate", "آماده محاسبه")}</strong><p>{l("Review the composition and conditions, then run the selected calculation modules.", "ترکیب و شرایط را بررسی کنید و سپس ماژول‌های انتخاب‌شده را اجرا کنید.")}</p></div>
                  </div>
                ) : (
                  <div className="readiness-report" aria-live="polite">
                    <div className="readiness-heading"><span className="eyebrow">{l("Calculation complete", "محاسبه تکمیل شد")}</span><strong>{studyResult.system} · {l("Results", "نتایج")}</strong><small>{l("Phase, property and transformation results are ready.", "نتایج فازی، خواص و تحولات آماده است.")}</small></div>
                    <div className="readiness-summary" aria-label={l("Study and calculation status", "وضعیت مطالعه و محاسبه")}>
                      <div className="ready"><CheckCircle2 size={17} /><span><small>{l("Study setup", "تنظیم مطالعه")}</small><strong>{l("Valid", "معتبر")}</strong></span></div>
                      <div className="ready"><CheckCircle2 size={17} /><span><small>{l("Calculation", "محاسبه")}</small><strong>{l("Completed", "تکمیل‌شده")}</strong></span></div>
                    </div>
                    <div className="readiness-list">
                      <div className="readiness-item pass"><CheckCircle2 size={16} /><span><strong>{l("Composition verified", "ترکیب تأیید شد")}</strong><small>{studyComponents.length} {l("elements · normalized to 100 wt%", "عنصر · نرمال‌شده تا ۱۰۰ درصد وزنی")}</small></span></div>
                      <div className="readiness-item pass"><CheckCircle2 size={16} /><span><strong>{l("48 temperature states", "۴۸ حالت دمایی")}</strong><small>{studyTempMin}–{studyTempMax} °C · 1 bar</small></span></div>
                      <div className="readiness-item pass"><CheckCircle2 size={16} /><span><strong>{l("Processing conditions applied", "شرایط فرایندی اعمال شد")}</strong><small>{studyCoolingRate} K/s · {studyGrainSize} µm · {studyStrainRate} s⁻¹</small></span></div>
                    </div>

                    <div className="local-result-kpis">
                      <div><span>{l("Estimated solidus", "دمای جامدشدن تخمینی")}</span><strong>{studyResult.summary.estimatedSolidusC.toFixed(0)} °C</strong></div>
                      <div><span>{l("Estimated liquidus", "دمای مایع‌شدن تخمینی")}</span><strong>{studyResult.summary.estimatedLiquidusC.toFixed(0)} °C</strong></div>
                      <div><span>{l("Mixing Gibbs energy", "انرژی گیبس اختلاط")}</span><strong>{studyResult.summary.gibbsMixAtMidpointKJMol.toFixed(2)} kJ/mol</strong></div>
                      <div><span>{l("Dominant phase tendency", "گرایش فاز غالب")}</span><strong>{studyResult.summary.dominantPhase}</strong></div>
                    </div>

                    <div className="local-study-chart">
                      <div className="local-result-heading"><div><span className="eyebrow">{l("Phase behaviour", "رفتار فازی")}</span><h3>{l("Estimated phase weights versus temperature", "سهم تخمینی فازها برحسب دما")}</h3></div><span>{l("48 calculated points", "۴۸ نقطه محاسبه‌شده")}</span></div>
                      <div className="chart-wrap">
                        <PhaseChart data={studyResult.points} phases={studyResult.phases} temperatureMin={studyTempMin} temperatureMax={studyTempMax} systemName={studyResult.system} />
                      </div>
                      <div className="phase-legend local-phase-legend">
                        {studyResult.phases.map((phase) => <div key={phase.key}><span style={{ backgroundColor: phase.color }} /><p><strong>{phase.label}</strong><small>{l("Calculated phase weight", "سهم محاسبه‌شده فاز")}</small></p></div>)}
                      </div>
                    </div>

                    <div className="local-screening-grid">
                      {selectedAnalyses.includes("intermetallic") && <div><span>{l("Intermetallic tendency", "گرایش بین‌فلزی")}</span><strong>{l(studyResult.summary.intermetallicRisk, studyResult.summary.intermetallicRisk === "Low" ? "کم" : studyResult.summary.intermetallicRisk === "Moderate" ? "متوسط" : "زیاد")}</strong><em>{studyResult.summary.intermetallicIndex.toFixed(1)} / 100</em></div>}
                      {selectedAnalyses.includes("tcp") && <div><span>{l("TCP tendency", "گرایش فازهای TCP")}</span><strong>{l(studyResult.summary.tcpRisk, studyResult.summary.tcpRisk === "Low" ? "کم" : studyResult.summary.tcpRisk === "Moderate" ? "متوسط" : "زیاد")}</strong><em>{studyResult.summary.tcpIndex.toFixed(1)} / 100</em></div>}
                      {selectedAnalyses.includes("solubility") && <div><span>{l("Solid-solution index", "شاخص محلول جامد")}</span><strong>{studyResult.summary.solidSolutionIndex.toFixed(1)}</strong><em>{l("higher values favour solution phases", "مقادیر بیشتر نشان‌دهنده گرایش به محلول جامد است")}</em></div>}
                      {selectedAnalyses.includes("sfe") && <div><span>{l("SFE tendency index", "شاخص گرایش انرژی نقص چیدمان")}</span><strong>{studyResult.summary.sfeIndexAtMidpoint.toFixed(1)}</strong><em>{l("dimensionless index", "شاخص بدون‌بُعد")}</em></div>}
                      {selectedAnalyses.includes("gibbs-energy") && <div><span>{l("Ideal mixing entropy", "آنتروپی ایده‌آل اختلاط")}</span><strong>{studyResult.summary.mixingEntropyJMolK.toFixed(2)}</strong><em>J/mol·K</em></div>}
                      {selectedAnalyses.includes("phase-stability") && <div><span>{l("Weighted melting point", "نقطه ذوب وزنی")}</span><strong>{studyResult.summary.weightedMeltingPointC.toFixed(0)} °C</strong><em>{l("composition-weighted estimate", "برآورد وزنی براساس ترکیب")}</em></div>}
                    </div>

                    {(selectedAnalyses.includes("physical-properties") || selectedAnalyses.includes("mechanical-properties")) && (
                      <section className="property-results" aria-label={l("Temperature-dependent material properties", "خواص وابسته به دمای ماده")}>
                        <div className="local-result-heading">
                          <div><span className="eyebrow">{l("Material properties", "خواص ماده")}</span><h3>{l("Physical and mechanical response", "پاسخ فیزیکی و مکانیکی")}</h3></div>
                          <span>{l("Mid-range summary", "خلاصه میانه بازه")}</span>
                        </div>
                        <div className="property-summary-grid">
                          {selectedAnalyses.includes("physical-properties") && <><div><span>{l("Density", "چگالی")}</span><strong>{studyResult.summary.densityAtMidpointKgM3.toFixed(0)}</strong><em>kg/m³</em></div><div><span>{l("Specific heat", "ظرفیت گرمایی ویژه")}</span><strong>{studyResult.summary.specificHeatAtMidpointJKgK.toFixed(0)}</strong><em>J/kg·K</em></div><div><span>{l("Thermal conductivity", "رسانایی گرمایی")}</span><strong>{studyResult.summary.thermalConductivityAtMidpointWMK.toFixed(1)}</strong><em>W/m·K</em></div></>}
                          {selectedAnalyses.includes("mechanical-properties") && <><div><span>{l("Young's modulus", "مدول یانگ")}</span><strong>{studyResult.summary.youngsModulusAtMidpointGPa.toFixed(1)}</strong><em>GPa</em></div><div><span>{l("Yield strength", "تنش تسلیم")}</span><strong>{studyResult.summary.yieldStrengthAtMidpointMPa.toFixed(0)}</strong><em>MPa</em></div><div><span>{l("Hardness", "سختی")}</span><strong>{studyResult.summary.hardnessAtMidpointHV.toFixed(0)}</strong><em>HV</em></div></>}
                        </div>
                        <div className="property-table-wrap">
                          <table className="property-table">
                            <thead><tr><th>{l("Temperature", "دما")} (°C)</th>{selectedAnalyses.includes("physical-properties") && <><th>{l("Density", "چگالی")} (kg/m³)</th><th>Cp (J/kg·K)</th><th>k (W/m·K)</th><th>α (µm/m·K)</th></>}{selectedAnalyses.includes("mechanical-properties") && <><th>E (GPa)</th><th>{l("Yield", "تسلیم")} (MPa)</th><th>{l("Hardness", "سختی")} (HV)</th></>}</tr></thead>
                            <tbody>{studyResult.properties.filter((_, index) => index % 8 === 0 || index === studyResult.properties.length - 1).map((property) => <tr key={property.temperature}><th>{property.temperature.toFixed(0)}</th>{selectedAnalyses.includes("physical-properties") && <><td>{property.densityKgM3.toFixed(0)}</td><td>{property.specificHeatJKgK.toFixed(0)}</td><td>{property.thermalConductivityWMK.toFixed(1)}</td><td>{property.thermalExpansionMicrostrainK.toFixed(1)}</td></>}{selectedAnalyses.includes("mechanical-properties") && <><td>{property.youngsModulusGPa.toFixed(1)}</td><td>{property.yieldStrengthMPa.toFixed(0)}</td><td>{property.hardnessHV.toFixed(0)}</td></>}</tr>)}</tbody>
                          </table>
                        </div>
                      </section>
                    )}

                    {selectedAnalyses.includes("transformations") && (
                      <section className="transformation-results" aria-label={l("Cooling transformation results", "نتایج تحولات سرمایشی")}>
                        <div className="local-result-heading"><div><span className="eyebrow">{l("Cooling path", "مسیر سرمایش")}</span><h3>{l("Transformation response", "پاسخ تحولی")}</h3></div><span>{studyCoolingRate} K/s</span></div>
                        <div className="transformation-grid">
                          <div><Timer size={18} /><span><small>{l("Cooling time", "زمان سرمایش")}</small><strong>{studyResult.summary.coolingTimeSeconds.toFixed(1)} s</strong></span></div>
                          <div><Zap size={18} /><span><small>{l("Rapid transformation index", "شاخص تحول سریع")}</small><strong>{studyResult.summary.rapidTransformationIndex.toFixed(1)} / 100</strong></span></div>
                          <div><ChartNoAxesCombined size={18} /><span><small>{l("Diffusive transformation index", "شاخص تحول نفوذی")}</small><strong>{studyResult.summary.diffusiveTransformationIndex.toFixed(1)} / 100</strong></span></div>
                        </div>
                      </section>
                    )}

                    <div className="no-result-notice local-model-notice"><ShieldCheck size={18} /><p><strong>{l("Model scope", "محدوده مدل")}</strong>{l("Engineering estimates are intended for material screening. Validate critical design decisions against qualified reference data.", "این برآوردهای مهندسی برای غربالگری مواد ارائه شده‌اند. تصمیم‌های حساس طراحی را با داده‌های مرجع معتبر ارزیابی کنید.")}</p></div>
                    <div className="study-readiness-actions">
                      <button className="study-export-button" onClick={exportLocalStudyJson}><Download size={16} /> {l("Export JSON", "دریافت JSON")}</button>
                      <button className="study-coverage-button" onClick={exportLocalStudyCsv}><Download size={16} /> {l("Export CSV", "دریافت CSV")}</button>
                    </div>
                    <span className="download-toast lab-download-status" role="status" aria-live="polite">{downloadMessage}</span>
                  </div>
                )}
              </section>
            </section>
          ) : (
            <section className="research-layout">
              <section className="pipeline-map panel">
                <div className="lab-section-heading"><div><span className="eyebrow">{l("Evidence architecture", "معماری شواهد")}</span><h2>{l("Research-to-database pipeline", "مسیر پژوهش تا پایگاه داده")}</h2></div><span className="component-count">{l("Human-reviewed", "بازبینی انسانی")}</span></div>
                <div className="pipeline-stages" aria-label={l("Evidence ingestion stages", "مراحل ورود شواهد")}>
                  {(language === "fa" ? ["کشف", "استخراج", "یکسان‌سازی", "بازبینی انسانی", "انتشار نسخه‌دار"] : ["Discover", "Extract", "Normalize", "Human review", "Versioned release"]).map((stage, index) => (
                    <div className="pipeline-stage-wrap" key={stage}>
                      <div className="pipeline-step"><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong><small>{(language === "fa" ? ["API، DOI یا فهرست", "فیلدهای ساخت‌یافته و شواهد", "واحدها، فازها و ترکیب", "بررسی منبع و عدم‌قطعیت", "هش، مجوز و منشأ"] : ["API, DOI or registry", "Structured fields + evidence", "Units, phases, composition", "Source and uncertainty check", "Hash, license and provenance"])[index]}</small></div>
                      {index < 4 && <span className="pipeline-connector" aria-hidden="true">→</span>}
                    </div>
                  ))}
                </div>
                <div className="pipeline-rule"><Sparkles size={18} /><p><strong>{l("Automation proposes; reviewers approve.", "سامانه پیشنهاد می‌دهد؛ بازبین تأیید می‌کند.")}</strong>{l("Only cited, licensed, unit-normalized and reviewed records enter a released dataset.", "تنها رکوردهای دارای منبع، مجوز، واحد یکسان و بازبینی‌شده وارد مجموعه‌داده منتشرشده می‌شوند.")}</p></div>
              </section>

              <section className="source-registry-grid" aria-label={l("Research source registry", "فهرست منابع پژوهشی")}>
                {researchSources.map((source) => (
                  <a className="research-source-card" key={source.name} href={source.href} target="_blank" rel="noreferrer">
                    <span><Database size={15} /> {l("Registered source", "منبع ثبت‌شده")}</span>
                    <h3>{source.name}</h3>
                    <p>{l(source.scope, "منبع داده علمی با منشأ و شرایط دسترسی مشخص")}</p>
                    <strong>{l(source.access, "مشاهده منبع")} ↗</strong>
                  </a>
                ))}
              </section>

              <section className="curation-panel panel">
                <div className="lab-section-heading"><div><span className="eyebrow">{l("Candidate intake", "ورود نامزدها")}</span><h2>{l("Build an evidence queue", "ساخت صف شواهد")}</h2></div><span className="component-count">{curationJobs.length} {l("candidates", "نامزد")}</span></div>
                <p className="section-intro">{l("Add scientific identifiers to a structured review queue. Records enter the database only after source, license and scientific review.", "شناسه‌های علمی را به صف بازبینی ساخت‌یافته اضافه کنید. رکوردها تنها پس از بررسی منبع، مجوز و اعتبار علمی وارد پایگاه داده می‌شوند.")}</p>
                <div className="curation-form">
                  <label><span>{l("Source", "منبع")}</span><select value={researchSource} onChange={(event) => setResearchSource(event.target.value)}>{researchSources.map((source) => <option key={source.name}>{source.name}</option>)}</select></label>
                  <label><span>{l("DOI, URL or record ID", "شناسه DOI، نشانی یا کد رکورد")}</span><input aria-label={l("DOI, URL or record ID", "شناسه منبع")} placeholder="10.xxxx/…" value={researchIdentifier} onChange={(event) => setResearchIdentifier(event.target.value)} /></label>
                  <label><span>{l("Property family", "گروه خاصیت")}</span><select value={researchProperty} onChange={(event) => setResearchProperty(event.target.value)}>{["Phase equilibria", "Gibbs energy", "Solubility", "Stacking-fault energy", "Intermetallic / TCP phases", "Thermophysical property"].map((property) => <option key={property}>{property}</option>)}</select></label>
                  <button onClick={addCurationJob} disabled={!researchIdentifier.trim()}><Plus size={16} /> {l("Add candidate", "افزودن نامزد")}</button>
                </div>

                <div className="curation-content">
                  <div className="curation-queue">
                    <h3>{l("Review queue", "صف بازبینی")}</h3>
                    {curationJobs.length === 0 ? (
                      <div className="queue-empty"><FileSearch size={24} /><strong>{l("No candidate records yet", "هنوز رکوردی ثبت نشده است")}</strong><p>{l("Add a DOI, public API identifier, or source URL.", "یک DOI، شناسه API عمومی یا نشانی منبع اضافه کنید.")}</p></div>
                    ) : curationJobs.map((job) => (
                      <article className="curation-job" key={job.id}>
                        <div><span>{job.source}</span><strong>{job.identifier}</strong><small>{job.system} · {job.property}</small></div>
                        <em>{l(job.stage, "نیازمند بازبینی انسانی")}</em>
                        <button aria-label={`Remove ${job.identifier}`} onClick={() => setCurationJobs((current) => current.filter((item) => item.id !== job.id))}><Trash2 size={15} /></button>
                      </article>
                    ))}
                  </div>
                  <div className="schema-fields">
                    <h3>{l("Required evidence record", "رکورد شواهد موردنیاز")}</h3>
                    <dl>
                      <div><dt>{l("Identity", "شناسه")}</dt><dd>{l("DOI / source ID, title, authors, year", "DOI یا شناسه منبع، عنوان، نویسندگان و سال")}</dd></div>
                      <div><dt>{l("System", "سامانه")}</dt><dd>{l("Elements, composition basis and exact values", "عناصر، مبنای ترکیب و مقادیر دقیق")}</dd></div>
                      <div><dt>{l("Conditions", "شرایط")}</dt><dd>{l("Temperature, pressure and processing history", "دما، فشار و سابقه فرایند")}</dd></div>
                      <div><dt>{l("Observation", "مشاهده")}</dt><dd>{l("Value, unit, uncertainty and method", "مقدار، واحد، عدم‌قطعیت و روش")}</dd></div>
                      <div><dt>{l("Phase evidence", "شواهد فازی")}</dt><dd>{l("Identity, constitution and interpretation", "شناسه، ساختار و تفسیر")}</dd></div>
                      <div><dt>{l("Governance", "حاکمیت داده")}</dt><dd>{l("License, reviewer, content hash and version", "مجوز، بازبین، هش محتوا و نسخه")}</dd></div>
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
              <span className="eyebrow"><Database size={15} /> {l("Materials intelligence", "هوشمندی مواد")}</span>
              <h1>{l("A database you can inspect, search and understand.", "پایگاه داده‌ای برای جستجو، بررسی و درک بهتر مواد.")}</h1>
              <p>{l("118 elements, 24 engineering alloy presets and six documented data packs. Each dataset records its source, version, validity range and review status.", "۱۱۸ عنصر، ۲۴ الگوی آلیاژ مهندسی و شش بسته داده مستند. منبع، نسخه، دامنه اعتبار و وضعیت بازبینی هر مجموعه ثبت می‌شود.")}</p>
            </div>
            <div className="library-stats">
              <div><strong>118</strong><span>{l("elements", "عنصر")}</span></div>
              <div><strong>24</strong><span>{l("alloy presets", "الگوی آلیاژ")}</span></div>
              <div><strong>6</strong><span>{l("phase systems", "سامانه فازی")}</span></div>
              <div><strong>{sources.length}</strong><span>{l("public references", "منبع عمومی")}</span></div>
            </div>
          </section>

          <section className="library-layout">
            <aside className="pack-sidebar panel">
              <div className="panel-heading"><div><span className="eyebrow">{l("Coverage", "پوشش")}</span><h2>{l("Data packs", "بسته‌های داده")}</h2></div></div>
              <div className="pack-list">
                {dataPacks.map((pack) => (
                  <button key={pack.code} aria-pressed={selectedPackCode === pack.code} className={selectedPackCode === pack.code ? "active" : ""} onClick={() => setSelectedPackCode(pack.code)}>
                    <span className="pack-code">{pack.code}</span>
                    <span><strong>{pack.title}</strong><small>{pack.models} {l("models", "مدل")} · {pack.phases} {l("displayed phases", "فاز نمایشی")}</small></span>
                    <em>{l(pack.status, "مستند")}</em>
                  </button>
                ))}
              </div>
              <div className="database-roadmap">
                <Sparkles size={17} />
                <p><strong>{l("Database expansion", "توسعه پایگاه داده")}</strong>{l("Add licensed or independently assessed parameter sets while preserving the same workflow.", "مجموعه‌پارامترهای دارای مجوز یا ارزیابی‌شده را با حفظ همین روند کاری اضافه کنید.")}</p>
              </div>
            </aside>

            <section className="catalog-panel panel">
              <div className="catalog-toolbar">
                <div className="segmented catalog-switch" aria-label={l("Catalog type", "نوع فهرست")}>
                  <button aria-pressed={dataMode === "elements"} className={dataMode === "elements" ? "active" : ""} onClick={() => switchDataMode("elements")}><Atom size={15} /> {l("Elements", "عناصر")}</button>
                  <button aria-pressed={dataMode === "alloys"} className={dataMode === "alloys" ? "active" : ""} onClick={() => switchDataMode("alloys")}><Layers3 size={15} /> {l("Alloy presets", "الگوهای آلیاژ")}</button>
                </div>
                <div className="search-field">
                  <Search size={17} />
                  <input aria-label={t.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
                  {query && <button onClick={() => setQuery("")} aria-label={l("Clear search", "پاک‌کردن جستجو")}>×</button>}
                </div>
              </div>

              <div className="pack-context" role="status">
                <span>{selectedPack.code}</span>
                <div className="pack-context-copy">
                  <p><strong>{selectedPack.title}</strong><small>{selectedPack.models} {l("models", "مدل")} · {selectedPack.phases} {l("displayed phases", "فاز نمایشی")} · {l(selectedPack.status, "مستند")}</small></p>
                  <dl className="pack-detail-grid">
                    <div><dt>{l("Components", "اجزا")}</dt><dd>{selectedPack.components}</dd></div>
                    <div><dt>{l("Input domain", "دامنه ورودی")}</dt><dd>{selectedPack.validity}</dd></div>
                    <div><dt>{l("Capabilities", "قابلیت‌ها")}</dt><dd>{l(selectedPack.capabilities, "محاسبات فازی و خواص برای سامانه انتخاب‌شده")}</dd></div>
                    <div><dt>{l("Data lineage", "منشأ داده")}</dt><dd>{l(selectedPack.provenance, "نسخه و منشأ داده ثبت شده است")}</dd></div>
                  </dl>
                </div>
              </div>

              {dataMode === "elements" ? (
                <>
                  <div className="catalog-intro"><p><strong>{elementCatalogStatus === "ready" ? `${filteredElements.length} ${l("elements", "عنصر")}` : l("Element catalog", "فهرست عناصر")}</strong>{l("Periodic reference catalog", "فهرست مرجع جدول تناوبی")}</p><span>periodic-table 0.0.8 · ISC</span></div>
                  {elementCatalogStatus === "idle" || elementCatalogStatus === "loading" ? (
                    <div className="catalog-loading" role="status"><span className="spinner" /><h3>{l("Loading the element catalog…", "در حال بارگذاری فهرست عناصر…")}</h3><p>{l("The catalog is loaded when needed.", "فهرست در زمان نیاز بارگذاری می‌شود.")}</p></div>
                  ) : elementCatalogStatus === "error" ? (
                    <div className="empty-state"><Info size={22} /><h3>{l("The element catalog did not load", "فهرست عناصر بارگذاری نشد")}</h3><p>{l("Retry this section without reloading the app.", "بدون بارگذاری دوباره برنامه، این بخش را دوباره امتحان کنید.")}</p><button onClick={() => { setElementCatalogStatus("idle"); setCatalogRetry((value) => value + 1); }}>{l("Retry catalog", "تلاش دوباره")}</button></div>
                  ) : filteredElements.length === 0 ? (
                    <div className="empty-state"><Search size={22} /><h3>{l(`No elements match “${query}”`, `عنصری با «${query}» پیدا نشد`)}</h3><p>{l("Try an element symbol, atomic number, or group name.", "نماد عنصر، عدد اتمی یا نام گروه را جستجو کنید.")}</p><button onClick={() => setQuery("")}>{l("Clear search", "پاک‌کردن جستجو")}</button></div>
                  ) : <div className="elements-grid">
                    {filteredElements.map((element) => (
                      <article className="periodic-card" key={element.atomicNumber}>
                        <span className="atomic-number">{element.atomicNumber}</span>
                        <strong>{element.symbol}</strong>
                        <h3>{element.name}</h3>
                        <dl>
                          <div><dt>{l("Atomic mass", "جرم اتمی")}</dt><dd>{String(element.atomicMass).replace(/\(.*\)/, "")}</dd></div>
                          <div><dt>{l("Melting", "ذوب")}</dt><dd>{element.meltingPoint || "—"}{element.meltingPoint ? " K" : ""}</dd></div>
                          <div><dt>{l("Density", "چگالی")}</dt><dd>{element.density || "—"}{element.density ? " g/cm³" : ""}</dd></div>
                        </dl>
                      </article>
                    ))}
                  </div>}
                </>
              ) : (
                <>
                  <div className="catalog-intro"><p><strong>{filteredAlloys.length} {l("presets", "الگو")}</strong>{l("Nominal engineering compositions", "ترکیب‌های اسمی مهندسی")}</p><span>{l("Verify against the applicable material standard", "با استاندارد ماده مربوطه تطبیق دهید")}</span></div>
                  {filteredAlloys.length === 0 ? (
                    <div className="empty-state"><Search size={22} /><h3>{l(`No alloy presets match “${query}”`, `الگوی آلیاژی با «${query}» پیدا نشد`)}</h3><p>{l("Try a grade, family, system, or application.", "گرید، خانواده، سامانه یا کاربرد را جستجو کنید.")}</p><button onClick={() => setQuery("")}>{l("Clear search", "پاک‌کردن جستجو")}</button></div>
                  ) : <div className="alloy-grid">
                    {filteredAlloys.map((alloy) => (
                      <article className="alloy-card" key={alloy.name}>
                        <div><span>{alloy.family}</span><em>{alloy.system}</em></div>
                        <h3>{alloy.name}</h3>
                        <p>{alloy.composition}</p>
                        <footer><span>{l("Typical use", "کاربرد متداول")}</span><strong>{alloy.use}</strong></footer>
                        {["AISI 1040", "AISI 430", "A356", "Ti–6Al–4V"].includes(alloy.name) ? (
                          <button className="use-alloy-button" onClick={() => exploreAlloyInWorkspace(alloy.name)}>{l("Open calculation", "بازکردن محاسبه")} →</button>
                        ) : (
                          <span className="catalog-only">{l("Catalog reference", "مرجع فهرست")}</span>
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
              <span className="eyebrow"><Microscope size={15} /> {l("Benchmarked with Thermo-Calc and JMatPro workflows", "مقایسه‌شده با روندهای Thermo-Calc و JMatPro")}</span>
              <h1>{l("Clear capabilities, clear model boundaries.", "قابلیت‌های روشن، مرزهای روشن مدل.")}</h1>
              <p>{l("See which calculations are available now and which advanced workflows require assessed CALPHAD data or specialist solvers. Proprietary databases and parameters are not copied.", "ببینید کدام محاسبات اکنون در دسترس‌اند و کدام روندهای پیشرفته به داده‌های ارزیابی‌شده CALPHAD یا حل‌گر تخصصی نیاز دارند. پایگاه داده یا پارامتر اختصاصی کپی نشده است.")}</p>
              <div className="coverage-actions">
                <button onClick={() => setView("workspace")}><Play size={16} /> {l("Try the calculators", "اجرای محاسبات")}</button>
                <button className="secondary" onClick={() => setView("lab")}><Workflow size={16} /> {l("Build a 2–6 component study", "ساخت مطالعه ۲ تا ۶ جزئی")}</button>
                <button className="secondary" onClick={() => setView("database")}><Database size={16} /> {l("Inspect the data", "بررسی داده‌ها")}</button>
              </div>
            </div>
            <div className="coverage-kpis" aria-label="Iran ThermoCalc coverage summary">
              <div><strong>4</strong><span>{l("interactive calculation workflows", "روند محاسباتی تعاملی")}</span></div>
              <div><strong>6</strong><span>{l("documented binary systems", "سامانه دوتایی مستند")}</span></div>
              <div><strong>118</strong><span>{l("element records", "رکورد عنصر")}</span></div>
              <div><strong>0</strong><span>{l("proprietary datasets copied", "مجموعه‌داده اختصاصی کپی‌شده")}</span></div>
            </div>
          </section>

          <section className="benchmark-section panel">
            <div className="benchmark-heading">
              <div><span className="eyebrow">{l("Feature benchmark", "مقایسه قابلیت‌ها")}</span><h2>{l("Capability-by-capability comparison", "مقایسه جزءبه‌جزء قابلیت‌ها")}</h2></div>
              <a href="https://www.sentesoftware.co.uk/jmatpro/full-details" target="_blank" rel="noreferrer">{l("Official JMatPro reference", "مرجع رسمی JMatPro")} ↗</a>
            </div>
            <div className="benchmark-table-wrap">
              <table className="benchmark-table">
                <thead><tr><th>{l("Capability", "قابلیت")}</th><th>{l("Commercial reference", "مرجع تجاری")}</th><th>{l("Iran ThermoCalc today", "وضعیت ایران ترموکلک")}</th><th>{l("Status", "وضعیت")}</th></tr></thead>
                <tbody>
                  {capabilityBenchmark.map((row) => (
                    <tr key={row.capability}>
                      <th scope="row">{row.capability}</th>
                      <td>{row.official}</td>
                      <td>{row.iran}</td>
                      <td><span className={`status-badge ${row.status}`}>{row.status === "proxy" ? l("Available estimate", "برآورد در دسترس") : row.status === "roadmap" ? l("Roadmap", "نقشه راه") : row.status === "missing" ? l("Not implemented", "پیاده‌سازی نشده") : l("Assessed data required", "نیازمند داده ارزیابی‌شده")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="database-gap-grid">
            <article className="database-gap-card available">
              <span>{l("Available now", "اکنون در دسترس")}</span><h2>{l("Calculation and data layer", "لایه محاسبه و داده")}</h2>
              <ul><li>{l("6 documented phase-system functions", "۶ تابع مستند سامانه فازی")}</li><li>{l("Single state, one-axis and cooling-path calculations", "محاسبات تک‌حالت، تک‌محوره و مسیر سرمایش")}</li><li>{l("118-element catalog and 24 alloy presets", "فهرست ۱۱۸ عنصر و ۲۴ الگوی آلیاژ")}</li><li>{l("CSV and JSON exports", "خروجی CSV و JSON")}</li></ul>
            </article>
            <article className="database-gap-card required">
              <span>{l("Advanced validation", "اعتبارسنجی پیشرفته")}</span><h2>{l("Assessed CALPHAD layer", "لایه CALPHAD ارزیابی‌شده")}</h2>
              <ul><li>{l("Multicomponent calculation engine is included", "موتور محاسبه چندجزئی در برنامه قرار دارد")}</li><li>{l("Qualified TDB datasets can be added with a valid licence", "مجموعه‌های TDB معتبر با مجوز قابل افزودن‌اند")}</li><li>{l("Certified equilibria require an assessed Gibbs-energy solver", "تعادل‌های گواهی‌شده به حل‌گر گیبس ارزیابی‌شده نیاز دارند")}</li><li>{l("Diffusion, precipitation and process solvers are expansion modules", "حل‌گرهای نفوذ، رسوب و فرایند ماژول‌های توسعه‌ای هستند")}</li></ul>
            </article>
            <article className="database-gap-card path">
              <span>{l("Expansion architecture", "معماری توسعه")}</span><h2>{l("Solver and database integration", "یکپارچه‌سازی حل‌گر و پایگاه داده")}</h2>
              <ul><li>{l("CALPHAD calculation service behind the UI", "سرویس محاسبات CALPHAD در پشت رابط")}</li><li>{l("Licensed or openly assessed TDB inputs", "ورودی TDB دارای مجوز یا ارزیابی آزاد")}</li><li>{l("Record-level provenance, version and validity", "منشأ، نسخه و اعتبار در سطح رکورد")}</li><li>{l("Regression tests against published reference cases", "آزمون بازگشت با موارد مرجع منتشرشده")}</li></ul>
            </article>
          </section>
        </main>
      )}

      {view === "method" && (
        <main className="method-page">
          <section className="method-hero">
            <div className="method-image" role="img" aria-label="Metallurgy laboratory research">
              <span>{l("Materials research in practice", "پژوهش مواد در عمل")}</span>
              <a href="https://www.uni-due.de/iw/en/research/current_research_reports.php" target="_blank" rel="noreferrer">{l("Image source", "منبع تصویر")} · University of Duisburg-Essen ↗</a>
            </div>
            <div className="method-copy">
              <span className="eyebrow"><ShieldCheck size={15} /> {l("Scientific integrity", "یکپارچگی علمی")}</span>
              <h1>{l("Good materials software starts with traceable data.", "نرم‌افزار خوب مواد با داده قابل‌ردیابی آغاز می‌شود.")}</h1>
              <p>{l("Commercial materials platforms combine assessed databases, specialised solvers and property models. Iran ThermoCalc keeps model scope, source lineage and validation status connected to every workflow, with a path for licensed or independently assessed parameter sets.", "سامانه‌های تجاری مواد، پایگاه‌های داده ارزیابی‌شده، حل‌گرهای تخصصی و مدل‌های خواص را ترکیب می‌کنند. ایران ترموکلک محدوده مدل، منشأ داده و وضعیت اعتبارسنجی را به هر روند متصل نگه می‌دارد و مسیر افزودن مجموعه‌پارامترهای دارای مجوز یا ارزیابی مستقل را فراهم می‌کند.")}</p>
              <div className="method-badges"><span>{l("Traceable lineage", "منشأ قابل‌ردیابی")}</span><span>{l("Explicit model limits", "حدود روشن مدل")}</span><span>{l("Versioned datasets", "داده‌های نسخه‌دار")}</span><span>{l("Qualified exports", "خروجی مستند")}</span></div>
            </div>
          </section>

          <section className="method-grid">
            <article className="method-card feature-card">
              <span className="card-number">01</span>
              <FlaskConical size={23} />
              <h2>{l("Define the system", "تعریف سامانه")}</h2>
              <p>{l("Choose the database, elements, composition units and balance component. The workspace keeps the selected model scope visible.", "پایگاه داده، عناصر، واحد ترکیب و جزء باقیمانده را انتخاب کنید. محیط کار محدوده مدل انتخاب‌شده را نمایش می‌دهد.")}</p>
            </article>
            <article className="method-card feature-card">
              <span className="card-number">02</span>
              <Gauge size={23} />
              <h2>{l("Set conditions", "تعیین شرایط")}</h2>
              <p>{l("Set temperature, pressure, composition and calculation path. Single-state, one-axis, solidification and multicomponent workflows are available.", "دما، فشار، ترکیب و مسیر محاسبه را تعیین کنید. روندهای تک‌حالت، تک‌محوره، انجماد و چندجزئی در دسترس‌اند.")}</p>
            </article>
            <article className="method-card feature-card">
              <span className="card-number">03</span>
              <ChartNoAxesCombined size={23} />
              <h2>{l("Inspect the result", "بررسی نتیجه")}</h2>
              <p>{l("Switch between plot and table, inspect phase and property values, and export calculated points with their calculation conditions.", "بین نمودار و جدول جابه‌جا شوید، مقادیر فاز و خواص را بررسی کنید و نقاط محاسبه‌شده را همراه با شرایط محاسبه خروجی بگیرید.")}</p>
            </article>
          </section>

          <section className="source-section">
            <div className="source-heading">
              <div><span className="eyebrow"><Globe2 size={15} /> {l("Research base", "پایه پژوهشی")}</span><h2>{l("Sources and benchmark references", "منابع و مراجع مقایسه")}</h2></div>
              <p>{l("These references document data sources, open calculation frameworks and commercial benchmark capabilities. Proprietary database files or parameters are not included.", "این مراجع منابع داده، چارچوب‌های محاسباتی باز و قابلیت‌های مرجع تجاری را مستند می‌کنند. فایل یا پارامتر پایگاه داده اختصاصی در برنامه قرار نگرفته است.")}</p>
            </div>
            <div className="source-grid">
              {sources.map((source) => (
                <a className="source-card" href={source.href} target="_blank" rel="noreferrer" key={source.title}>
                  <span>{source.type}</span>
                  <h3>{source.title}</h3>
                  <p>{source.label}</p>
                  <strong>{l("View reference", "مشاهده مرجع")} ↗</strong>
                </a>
              ))}
            </div>
          </section>

          <section className="disclaimer-card">
            <Info size={22} />
            <div><h2>{l("Validation and engineering use", "اعتبارسنجی و کاربرد مهندسی")}</h2><p>{l("The application, responsive interface, catalogs, exports and calculation workflows are functional. Validate safety-critical or certification decisions against qualified datasets and approved engineering methods.", "برنامه، رابط واکنش‌گرا، فهرست‌ها، خروجی‌ها و روندهای محاسباتی فعال‌اند. تصمیم‌های ایمنی‌محور یا نیازمند گواهی را با مجموعه‌داده معتبر و روش‌های مهندسی تأییدشده اعتبارسنجی کنید.")}</p></div>
            <button onClick={() => setView("workspace")}>{l("Open workspace", "بازکردن محیط محاسبه")}</button>
          </section>
        </main>
      )}
    </div>
  );
}
