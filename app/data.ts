export type PhaseKey =
  | "ferrite"
  | "austenite"
  | "cementite"
  | "liquid"
  | "alpha"
  | "beta"
  | "silicon"
  | "fcc"
  | "gamma"
  | "gammaPrime"
  | "sigma";

export type PhasePoint = { temperature: number } & Record<string, number>;

export type SystemPreset = {
  id: string;
  name: string;
  database: string;
  family: string;
  base: string;
  solute: string;
  maxComposition: number;
  defaultComposition: number;
  tempMin: number;
  tempMax: number;
  phases: { key: PhaseKey; label: string; color: string }[];
  note: string;
};

export const systems: SystemPreset[] = [
  {
    id: "fe-c",
    name: "Fe–C",
    database: "Fe demo heuristic v0.1",
    family: "Steels & cast irons",
    base: "Fe",
    solute: "C",
    maxComposition: 6.67,
    defaultComposition: 0.4,
    tempMin: 400,
    tempMax: 1600,
    phases: [
      { key: "ferrite", label: "BCC_A2 · Ferrite", color: "#1ec8a5" },
      { key: "austenite", label: "FCC_A1 · Austenite", color: "#6a7cff" },
      { key: "cementite", label: "Cementite", color: "#f4a43b" },
      { key: "liquid", label: "Liquid", color: "#ec5b6f" },
    ],
    note: "Educational Fe–C topology heuristic with eutectoid and eutectic landmarks.",
  },
  {
    id: "al-si",
    name: "Al–Si",
    database: "Al demo heuristic v0.1",
    family: "Aluminium casting alloys",
    base: "Al",
    solute: "Si",
    maxComposition: 25,
    defaultComposition: 7,
    tempMin: 350,
    tempMax: 750,
    phases: [
      { key: "alpha", label: "FCC_A1 · α-Al", color: "#1ec8a5" },
      { key: "silicon", label: "Diamond_A4 · Si", color: "#f4a43b" },
      { key: "liquid", label: "Liquid", color: "#ec5b6f" },
    ],
    note: "Educational Al–Si eutectic model centered on 12.6 wt% Si at 577 °C.",
  },
  {
    id: "cu-ni",
    name: "Cu–Ni",
    database: "Cu demo heuristic v0.1",
    family: "Copper alloys",
    base: "Cu",
    solute: "Ni",
    maxComposition: 100,
    defaultComposition: 30,
    tempMin: 800,
    tempMax: 1550,
    phases: [
      { key: "fcc", label: "FCC_A1 · Solid solution", color: "#1ec8a5" },
      { key: "liquid", label: "Liquid", color: "#ec5b6f" },
    ],
    note: "Educational isomorphous model for the fully miscible Cu–Ni system.",
  },
  {
    id: "ni-al",
    name: "Ni–Al",
    database: "Ni demo heuristic v0.1",
    family: "Nickel superalloys",
    base: "Ni",
    solute: "Al",
    maxComposition: 35,
    defaultComposition: 12,
    tempMin: 500,
    tempMax: 1700,
    phases: [
      { key: "gamma", label: "FCC_A1 · γ", color: "#6a7cff" },
      { key: "gammaPrime", label: "L1₂ · γ′", color: "#f4a43b" },
      { key: "beta", label: "B2 · β", color: "#1ec8a5" },
      { key: "liquid", label: "Liquid", color: "#ec5b6f" },
    ],
    note: "Educational γ/γ′/β phase-window model for nickel–aluminium exploration.",
  },
  {
    id: "ti-al",
    name: "Ti–Al",
    database: "Ti demo heuristic v0.1",
    family: "Titanium alloys",
    base: "Ti",
    solute: "Al",
    maxComposition: 40,
    defaultComposition: 6,
    tempMin: 500,
    tempMax: 1800,
    phases: [
      { key: "alpha", label: "HCP_A3 · α", color: "#1ec8a5" },
      { key: "beta", label: "BCC_A2 · β", color: "#6a7cff" },
      { key: "gamma", label: "L1₀ · γ", color: "#f4a43b" },
      { key: "liquid", label: "Liquid", color: "#ec5b6f" },
    ],
    note: "Educational α/β/γ phase-window model for Ti–Al alloy design.",
  },
  {
    id: "fe-cr",
    name: "Fe–Cr",
    database: "Fe demo heuristic v0.1",
    family: "Stainless steels",
    base: "Fe",
    solute: "Cr",
    maxComposition: 45,
    defaultComposition: 18,
    tempMin: 400,
    tempMax: 1600,
    phases: [
      { key: "ferrite", label: "BCC_A2 · Ferrite", color: "#1ec8a5" },
      { key: "austenite", label: "FCC_A1 · Austenite", color: "#6a7cff" },
      { key: "sigma", label: "σ phase", color: "#f4a43b" },
      { key: "liquid", label: "Liquid", color: "#ec5b6f" },
    ],
    note: "Educational Fe–Cr phase-window model including a visible σ-risk region.",
  },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function normalize(values: Record<string, number>) {
  const rawValues = Object.values(values);
  if (rawValues.some((value) => !Number.isFinite(value) || value < -1e-9)) {
    throw new Error("Illustrative model produced an invalid phase weight.");
  }
  const total = rawValues.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, Number((Math.max(0, value) / total).toFixed(4))]),
  );
}

function fractionsFor(systemId: string, t: number, x: number): Record<string, number> {
  if (systemId === "fe-c") {
    if (x < 0.001) {
      if (t >= 1538) return normalize({ liquid: 1, ferrite: 0, austenite: 0, cementite: 0 });
      if (t >= 1394) return normalize({ liquid: 0, ferrite: 1, austenite: 0, cementite: 0 });
      if (t >= 912) return normalize({ liquid: 0, ferrite: 0, austenite: 1, cementite: 0 });
      return normalize({ liquid: 0, ferrite: 1, austenite: 0, cementite: 0 });
    }
    const liquidus = x <= 4.3 ? 1538 - 91 * x : 1147 + 70 * (x - 4.3);
    const solidus = x < 0.18 ? 1493 - 400 * x : x < 2.1 ? 1390 - 116 * x : 1147;
    if (t >= liquidus) return normalize({ liquid: 1, ferrite: 0, austenite: 0, cementite: 0 });
    if (t > solidus) {
      const liquid = clamp((t - solidus) / Math.max(1, liquidus - solidus));
      return normalize({ liquid, austenite: 1 - liquid, ferrite: 0, cementite: 0 });
    }
    if (t > 727) {
      if (x <= 0.76) {
        const a3 = 912 - 243 * Math.pow(x / 0.76, 0.55);
        const austenite = clamp((t - 727) / Math.max(1, a3 - 727));
        return normalize({ ferrite: 1 - austenite, austenite, cementite: 0, liquid: 0 });
      }
      const acm = 727 + 420 * clamp((x - 0.76) / (2.11 - 0.76));
      const austenite = clamp((t - 727) / Math.max(1, acm - 727));
      return normalize({ ferrite: 0, austenite, cementite: 1 - austenite, liquid: 0 });
    }
    return normalize({ ferrite: clamp((6.67 - x) / 6.67), cementite: clamp(x / 6.67), austenite: 0, liquid: 0 });
  }

  if (systemId === "al-si") {
    if (x < 0.001) return normalize({ liquid: t >= 660 ? 1 : 0, alpha: t < 660 ? 1 : 0, silicon: 0 });
    const liquidus = x <= 12.6 ? 660 - 6.59 * x : 577 + 7.1 * (x - 12.6);
    if (t >= liquidus) return normalize({ liquid: 1, alpha: 0, silicon: 0 });
    if (t > 577) {
      const liquid = clamp((t - 577) / Math.max(1, liquidus - 577));
      return normalize({ liquid, alpha: x <= 12.6 ? 1 - liquid : 0, silicon: x > 12.6 ? 1 - liquid : 0 });
    }
    return normalize({ alpha: clamp((100 - x) / 100), silicon: clamp(x / 100), liquid: 0 });
  }

  if (systemId === "cu-ni") {
    const base = 1085 + 3.7 * x;
    const solidus = base - 55 * Math.sin((Math.PI * x) / 100);
    const liquidus = base + 55 * Math.sin((Math.PI * x) / 100);
    if (t >= liquidus) return normalize({ liquid: 1, fcc: 0 });
    if (t <= solidus) return normalize({ fcc: 1, liquid: 0 });
    const liquid = clamp((t - solidus) / Math.max(1, liquidus - solidus));
    return normalize({ liquid, fcc: 1 - liquid });
  }

  if (systemId === "ni-al") {
    const liquidus = 1455 + 2.1 * x;
    if (t >= liquidus) return normalize({ liquid: 1, gamma: 0, gammaPrime: 0, beta: 0 });
    const gammaPrimeRaw = clamp((x - 4) / 16) * clamp((1150 - t) / 400);
    const betaRaw = clamp((x - 20) / 15) * clamp((1450 - t) / 500);
    const orderedScale = gammaPrimeRaw + betaRaw > 1 ? 1 / (gammaPrimeRaw + betaRaw) : 1;
    const gammaPrime = gammaPrimeRaw * orderedScale;
    const beta = betaRaw * orderedScale;
    return normalize({ gamma: clamp(1 - gammaPrime - beta), gammaPrime, beta, liquid: 0 });
  }

  if (systemId === "ti-al") {
    const liquidus = 1668 - 5.2 * x;
    if (t >= liquidus) return normalize({ liquid: 1, alpha: 0, beta: 0, gamma: 0 });
    const gammaRaw = clamp((x - 32) / 18) * clamp((1350 - t) / 500);
    const betaRaw = clamp((t - (882 + 4 * x)) / 350);
    const orderedScale = gammaRaw + betaRaw > 1 ? 1 / (gammaRaw + betaRaw) : 1;
    const gamma = gammaRaw * orderedScale;
    const beta = betaRaw * orderedScale;
    return normalize({ alpha: clamp(1 - gamma - beta), beta, gamma, liquid: 0 });
  }

  if (systemId === "fe-cr") {
    const liquidus = 1538 - 2.2 * x;
    if (t >= liquidus) return normalize({ liquid: 1, ferrite: 0, austenite: 0, sigma: 0 });
    const sigmaRaw = clamp((x - 12) / 20) * clamp(1 - Math.abs(t - 750) / 260) * 0.45;
    const austeniteRaw = clamp(1 - x / 28) * clamp(1 - Math.abs(t - 1050) / 430);
    const solidScale = sigmaRaw + austeniteRaw > 1 ? 1 / (sigmaRaw + austeniteRaw) : 1;
    const sigma = sigmaRaw * solidScale;
    const austenite = austeniteRaw * solidScale;
    return normalize({ ferrite: clamp(1 - sigma - austenite), austenite, sigma, liquid: 0 });
  }

  throw new Error(`Unknown illustrative system: ${systemId}`);
}

export function calculateSystem(systemId: string, composition: number, min: number, max: number): PhasePoint[] {
  const system = systems.find((item) => item.id === systemId);
  if (!system) throw new Error(`Unknown illustrative system: ${systemId}`);
  if (composition < 0 || composition > system.maxComposition) throw new Error("Composition is outside the model scope.");
  if (min >= max) throw new Error("Temperature range must increase.");
  const points = 36;
  return Array.from({ length: points }, (_, index) => {
    const temperature = min + ((max - min) * index) / (points - 1);
    return {
      temperature: Number(temperature.toFixed(3)),
      ...fractionsFor(systemId, temperature, composition),
    } as PhasePoint;
  });
}

export function calculatePoint(systemId: string, composition: number, temperature: number): PhasePoint {
  const system = systems.find((item) => item.id === systemId);
  if (!system) throw new Error(`Unknown illustrative system: ${systemId}`);
  if (composition < 0 || composition > system.maxComposition) throw new Error("Composition is outside the model scope.");
  if (temperature < system.tempMin || temperature > system.tempMax) throw new Error("Temperature is outside the model scope.");
  return {
    temperature: Number(temperature.toFixed(3)),
    ...fractionsFor(systemId, temperature, composition),
  } as PhasePoint;
}

export const alloyPresets = [
  { name: "AISI 1040", family: "Carbon steel", system: "Fe–C–Mn", composition: "0.40 C · 0.75 Mn · bal. Fe", use: "Shafts & machine parts" },
  { name: "AISI 4140", family: "Low-alloy steel", system: "Fe–Cr–Mo", composition: "0.40 C · 1.0 Cr · 0.2 Mo", use: "Gears & pressure parts" },
  { name: "AISI 4340", family: "Ni–Cr–Mo steel", system: "Fe–Ni–Cr–Mo", composition: "0.40 C · 1.8 Ni · 0.8 Cr", use: "High-strength structures" },
  { name: "AISI 304", family: "Austenitic stainless", system: "Fe–Cr–Ni", composition: "18 Cr · 8 Ni · ≤0.08 C", use: "Process equipment" },
  { name: "AISI 316L", family: "Austenitic stainless", system: "Fe–Cr–Ni–Mo", composition: "17 Cr · 12 Ni · 2.5 Mo", use: "Corrosive service" },
  { name: "AISI 430", family: "Ferritic stainless", system: "Fe–Cr", composition: "16.5 Cr · ≤0.12 C", use: "Appliances & cladding" },
  { name: "AISI H13", family: "Tool steel", system: "Fe–Cr–Mo–V", composition: "0.40 C · 5.2 Cr · 1.3 Mo", use: "Hot-work tooling" },
  { name: "Ductile iron 65-45-12", family: "Cast iron", system: "Fe–C–Si", composition: "3.6 C · 2.5 Si · bal. Fe", use: "Pipes & castings" },
  { name: "Grey iron Class 30", family: "Cast iron", system: "Fe–C–Si", composition: "3.2 C · 2.1 Si · bal. Fe", use: "Machine bases" },
  { name: "Al 1050", family: "Wrought aluminium", system: "Al", composition: "≥99.5 Al", use: "Electrical & sheet" },
  { name: "Al 2024", family: "Al–Cu", system: "Al–Cu–Mg", composition: "4.4 Cu · 1.5 Mg · 0.6 Mn", use: "Aerospace structures" },
  { name: "Al 6061", family: "Al–Mg–Si", system: "Al–Mg–Si", composition: "1.0 Mg · 0.6 Si · 0.3 Cu", use: "Extrusions & frames" },
  { name: "Al 7075", family: "Al–Zn–Mg", system: "Al–Zn–Mg–Cu", composition: "5.6 Zn · 2.5 Mg · 1.6 Cu", use: "High-strength aerospace" },
  { name: "A356", family: "Cast aluminium", system: "Al–Si–Mg", composition: "7.0 Si · 0.35 Mg · bal. Al", use: "Automotive castings" },
  { name: "C11000", family: "Copper", system: "Cu", composition: "≥99.9 Cu", use: "Conductors" },
  { name: "C26000", family: "Cartridge brass", system: "Cu–Zn", composition: "70 Cu · 30 Zn", use: "Deep-drawn parts" },
  { name: "C93200", family: "Tin bronze", system: "Cu–Sn–Pb", composition: "83 Cu · 7 Sn · 7 Pb", use: "Bearings" },
  { name: "Inconel 625", family: "Ni superalloy", system: "Ni–Cr–Mo–Nb", composition: "21.5 Cr · 9 Mo · 3.6 Nb", use: "Hot corrosive service" },
  { name: "Inconel 718", family: "Ni superalloy", system: "Ni–Fe–Cr–Nb", composition: "19 Cr · 18 Fe · 5.1 Nb", use: "Turbomachinery" },
  { name: "Hastelloy C-276", family: "Ni superalloy", system: "Ni–Mo–Cr", composition: "16 Mo · 15.5 Cr · 5.5 Fe", use: "Chemical processing" },
  { name: "Ti Grade 2", family: "Commercial titanium", system: "Ti", composition: "≥99.2 Ti", use: "Heat exchangers" },
  { name: "Ti–6Al–4V", family: "α+β titanium", system: "Ti–Al–V", composition: "6 Al · 4 V · bal. Ti", use: "Aerospace & implants" },
  { name: "AZ91D", family: "Magnesium", system: "Mg–Al–Zn", composition: "9 Al · 0.7 Zn · bal. Mg", use: "Die castings" },
  { name: "Zamak 3", family: "Zinc", system: "Zn–Al", composition: "4 Al · 0.05 Mg · bal. Zn", use: "Precision die castings" },
];

export const dataPacks = [
  {
    code: "IRFE",
    title: "Steel & Fe alloys",
    models: 2,
    phases: 5,
    status: "Heuristic",
    components: "Fe · C · Cr",
    validity: "400–1600 °C · 1 bar · unvalidated",
    capabilities: "Phase weights · transition and liquid-window proxies",
    provenance: "Transparent Fe–C / Fe–Cr functions · no record-level scientific source",
  },
  {
    code: "IRAL",
    title: "Aluminium alloys",
    models: 1,
    phases: 3,
    status: "Heuristic",
    components: "Al · Si",
    validity: "350–750 °C · 1 bar · unvalidated",
    capabilities: "Eutectic topology · liquid-window proxy",
    provenance: "Transparent Al–Si function · no record-level scientific source",
  },
  {
    code: "IRNI",
    title: "Nickel alloys",
    models: 1,
    phases: 4,
    status: "Heuristic",
    components: "Ni · Al",
    validity: "500–1700 °C · 1 bar · unvalidated",
    capabilities: "γ / γ′ / β phase-window exploration",
    provenance: "Transparent Ni–Al function · no record-level scientific source",
  },
  {
    code: "IRTI",
    title: "Titanium alloys",
    models: 1,
    phases: 4,
    status: "Heuristic",
    components: "Ti · Al",
    validity: "500–1800 °C · 1 bar · unvalidated",
    capabilities: "α / β / γ phase-window exploration",
    provenance: "Transparent Ti–Al function · no record-level scientific source",
  },
  {
    code: "IRCU",
    title: "Copper alloys",
    models: 1,
    phases: 2,
    status: "Heuristic",
    components: "Cu · Ni",
    validity: "800–1550 °C · 1 bar · unvalidated",
    capabilities: "Isomorphous solid/liquid exploration",
    provenance: "Transparent Cu–Ni function · no record-level scientific source",
  },
  {
    code: "IRPURE",
    title: "Pure elements",
    models: 0,
    phases: 0,
    status: "Reference catalog",
    components: "118 periodic elements",
    validity: "Reference values as supplied by the package",
    capabilities: "Atomic mass · melting point · density",
    provenance: "periodic-table 0.0.8 · ISC license",
  },
];

export const sources = [
  { title: "NIST Alloy Data", label: "Unary, binary and ternary metal-system properties", href: "https://www.nist.gov/mml/acmd/trc/nist-alloy-data", type: "Government data" },
  { title: "NIST structured literature capture", label: "Experimental metadata, phase identification and uncertainty model", href: "https://www.nist.gov/node/1283981", type: "Data method" },
  { title: "NIST Chemistry WebBook", label: "Thermochemical and thermophysical reference data", href: "https://webbook.nist.gov/", type: "Government data" },
  { title: "Materials Project", label: "Computed materials, thermodynamics, provenance and alloy endpoints", href: "https://docs.materialsproject.org/downloading-data/using-the-api/getting-started", type: "Public API" },
  { title: "OQMD", label: "Open computed formation-energy and phase-stability data", href: "https://www.oqmd.org/api/", type: "Public API" },
  { title: "pycalphad", label: "Open-source CALPHAD calculation framework and TDB parser", href: "https://pycalphad.org/docs/latest/", type: "Open source" },
  { title: "Thermo-Calc product reference", label: "Reference workflow, calculators and database categories", href: "https://thermocalc.com/products/thermo-calc/", type: "Benchmark" },
];
