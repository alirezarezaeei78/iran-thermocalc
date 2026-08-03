export type LocalElement = {
  symbol: string;
  atomicMass: string | number;
  meltingPoint: string | number;
  groupBlock?: string;
};

export type LocalStudyComponent = {
  symbol: string;
  wtPercent: number;
};

export type LocalPhasePoint = {
  temperature: number;
  liquid: number;
  fcc: number;
  bcc: number;
  hcp: number;
  intermetallic: number;
  tcp: number;
  gibbsMixKJMol: number;
  sfeIndex: number;
} & Record<string, number>;

export type LocalStudyResult = {
  engine: {
    id: "iran-local-screening";
    version: "1.0.0";
    execution: "local-browser";
    remoteRequests: 0;
  };
  system: string;
  components: Array<LocalStudyComponent & { moleFraction: number }>;
  conditions: { temperatureC: [number, number]; pressureBar: 1; points: number };
  phases: Array<{ key: "liquid" | "fcc" | "bcc" | "hcp" | "intermetallic" | "tcp"; label: string; color: string }>;
  points: LocalPhasePoint[];
  summary: {
    weightedMeltingPointC: number;
    estimatedSolidusC: number;
    estimatedLiquidusC: number;
    mixingEntropyJMolK: number;
    mixingEnthalpyProxyKJMol: number;
    gibbsMixAtMidpointKJMol: number;
    dominantPhase: string;
    phaseRanking: Array<{ phase: string; fraction: number }>;
    intermetallicIndex: number;
    intermetallicRisk: "Low" | "Moderate" | "High";
    tcpIndex: number;
    tcpRisk: "Low" | "Moderate" | "High";
    solidSolutionIndex: number;
    sfeIndexAtMidpoint: number;
  };
  warnings: string[];
};

const gasConstant = 8.314462618;
const fccElements = new Set(["Al", "Ni", "Cu", "Ag", "Au", "Pt", "Pd", "Pb", "Ir", "Rh"]);
const bccElements = new Set(["Fe", "Cr", "Mo", "W", "V", "Nb", "Ta", "Li", "Na", "K"]);
const hcpElements = new Set(["Ti", "Zr", "Hf", "Mg", "Co", "Zn", "Cd", "Re", "Ru", "Os"]);
const matrixElements = new Set(["Fe", "Ni", "Co", "Al"]);
const orderedFormers = new Set(["Al", "Ti", "Ta", "Nb", "Si", "Sn", "Ga"]);
const refractoryElements = new Set(["Cr", "Mo", "W", "Re", "Nb", "Ta", "V"]);

const fallbackMeltingPointK: Record<string, number> = {
  Al: 933.47, Co: 1768, Cr: 2180, Cu: 1357.77, Fe: 1811, Mg: 923, Mo: 2896,
  Ni: 1728, Si: 1687, Ta: 3290, Ti: 1941, V: 2183, W: 3695,
};

const pairInteractionKJMol: Record<string, number> = {
  "Al-Co": -19, "Al-Fe": -11, "Al-Mg": -2, "Al-Ni": -22, "Al-Si": -8,
  "Al-Ta": -28, "Al-Ti": -15, "Co-Cr": -1, "Co-W": -5, "Cr-Fe": 3,
  "Cr-Ni": -1, "Fe-Mo": -2, "Fe-Ni": -2, "Ni-Ta": -30, "Ni-Ti": -35,
};

const phases: LocalStudyResult["phases"] = [
  { key: "liquid", label: "Liquid estimate", color: "#ec5b6f" },
  { key: "fcc", label: "FCC-like solution", color: "#6a7cff" },
  { key: "bcc", label: "BCC-like solution", color: "#1ec8a5" },
  { key: "hcp", label: "HCP-like solution", color: "#9b70d8" },
  { key: "intermetallic", label: "Ordered / intermetallic tendency", color: "#f4a43b" },
  { key: "tcp", label: "TCP tendency", color: "#ad5968" },
];

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const parseNumeric = (value: string | number, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const pairKey = (left: string, right: string) => [left, right].sort().join("-");
const riskLevel = (index: number): "Low" | "Moderate" | "High" => index >= 0.66 ? "High" : index >= 0.33 ? "Moderate" : "Low";
const gaussian = (value: number, center: number, width: number) => Math.exp(-Math.pow((value - center) / Math.max(width, 1), 2));

export function runLocalMulticomponentStudy(
  inputComponents: LocalStudyComponent[],
  elements: LocalElement[],
  temperatureMin: number,
  temperatureMax: number,
): LocalStudyResult {
  const totalWeight = inputComponents.reduce((sum, component) => sum + Math.max(0, component.wtPercent), 0);
  if (inputComponents.length < 2 || totalWeight <= 0 || temperatureMin >= temperatureMax) {
    throw new Error("A local study needs at least two components, positive composition, and an increasing temperature range.");
  }

  const elementMap = new Map(elements.map((element) => [element.symbol, element]));
  const normalized = inputComponents.map((component) => ({
    symbol: component.symbol,
    wtPercent: (Math.max(0, component.wtPercent) / totalWeight) * 100,
  }));
  const moleRows = normalized.map((component) => {
    const element = elementMap.get(component.symbol);
    const atomicMass = parseNumeric(element?.atomicMass ?? 0, 55);
    return { ...component, element, moles: component.wtPercent / atomicMass };
  });
  const totalMoles = moleRows.reduce((sum, component) => sum + component.moles, 0);
  const components = moleRows.map((component) => ({
    symbol: component.symbol,
    wtPercent: Number(component.wtPercent.toFixed(6)),
    moleFraction: component.moles / totalMoles,
  }));
  const moleFraction = new Map(components.map((component) => [component.symbol, component.moleFraction]));
  const fractionFor = (symbols: Set<string>) => components.reduce((sum, component) => sum + (symbols.has(component.symbol) ? component.moleFraction : 0), 0);

  const weightedMeltingPointK = components.reduce((sum, component) => {
    const element = elementMap.get(component.symbol);
    const fallback = fallbackMeltingPointK[component.symbol] ?? 1473.15;
    return sum + component.moleFraction * parseNumeric(element?.meltingPoint ?? 0, fallback);
  }, 0);
  const weightedMeltingPointC = weightedMeltingPointK - 273.15;
  const mixingEntropyJMolK = -gasConstant * components.reduce((sum, component) => (
    sum + (component.moleFraction > 0 ? component.moleFraction * Math.log(component.moleFraction) : 0)
  ), 0);
  const maximumEntropy = gasConstant * Math.log(components.length);
  const entropyRatio = maximumEntropy > 0 ? clamp(mixingEntropyJMolK / maximumEntropy) : 0;

  let mixingEnthalpyProxyKJMol = 0;
  for (let left = 0; left < components.length; left += 1) {
    for (let right = left + 1; right < components.length; right += 1) {
      const interaction = pairInteractionKJMol[pairKey(components[left].symbol, components[right].symbol)] ?? 0;
      mixingEnthalpyProxyKJMol += 4 * components[left].moleFraction * components[right].moleFraction * interaction;
    }
  }

  const matrixFraction = fractionFor(matrixElements);
  const orderedFormerFraction = fractionFor(orderedFormers);
  const refractoryFraction = fractionFor(refractoryElements);
  const intermetallicIndex = clamp(matrixFraction * orderedFormerFraction * 5 + Math.max(0, -mixingEnthalpyProxyKJMol) / 45);
  const tcpIndex = clamp(matrixFraction * refractoryFraction * 5.5 + refractoryFraction * refractoryFraction);
  const solidSolutionIndex = clamp(1 - 0.62 * intermetallicIndex - 0.55 * tcpIndex) * 100;

  const solidificationSpan = 55 + entropyRatio * 190 + Math.max(0, components.length - 2) * 12;
  const estimatedLiquidusC = weightedMeltingPointC + 18 - entropyRatio * 34;
  const estimatedSolidusC = estimatedLiquidusC - solidificationSpan;
  const midpointC = (temperatureMin + temperatureMax) / 2;
  const baseFcc = 0.16 + fractionFor(fccElements) + (moleFraction.get("Ni") ?? 0) * 0.35 + (moleFraction.get("Fe") ?? 0) * 0.18;
  const baseBcc = 0.16 + fractionFor(bccElements) + (moleFraction.get("Ti") ?? 0) * 0.28;
  const baseHcp = 0.1 + fractionFor(hcpElements);
  const pointCount = 48;

  const points: LocalPhasePoint[] = Array.from({ length: pointCount }, (_, index) => {
    const temperature = temperatureMin + (index / (pointCount - 1)) * (temperatureMax - temperatureMin);
    const liquidProgress = clamp((temperature - estimatedSolidusC) / Math.max(estimatedLiquidusC - estimatedSolidusC, 1));
    const liquid = liquidProgress * liquidProgress * (3 - 2 * liquidProgress);
    const solid = 1 - liquid;
    const normalizedTemperature = clamp((temperature - temperatureMin) / Math.max(temperatureMax - temperatureMin, 1));
    const solidWindow = Math.max(estimatedLiquidusC - estimatedSolidusC, 80);
    const raw = {
      fcc: baseFcc * (1 + 0.12 * normalizedTemperature),
      bcc: baseBcc * (0.88 + 0.3 * normalizedTemperature),
      hcp: baseHcp * (1.12 - 0.3 * normalizedTemperature),
      intermetallic: 0.025 + intermetallicIndex * 1.45 * gaussian(temperature, estimatedSolidusC - solidWindow * 0.15, solidWindow * 1.15),
      tcp: 0.015 + tcpIndex * 1.2 * gaussian(temperature, estimatedSolidusC - solidWindow * 0.05, solidWindow * 0.9),
    };
    const rawTotal = raw.fcc + raw.bcc + raw.hcp + raw.intermetallic + raw.tcp;
    const fcc = solid * raw.fcc / rawTotal;
    const bcc = solid * raw.bcc / rawTotal;
    const hcp = solid * raw.hcp / rawTotal;
    const intermetallic = solid * raw.intermetallic / rawTotal;
    const tcp = solid * raw.tcp / rawTotal;
    const temperatureK = temperature + 273.15;
    const gibbsMixKJMol = mixingEnthalpyProxyKJMol - temperatureK * mixingEntropyJMolK / 1000;
    const fccPromoters = (moleFraction.get("Ni") ?? 0) + (moleFraction.get("Co") ?? 0) * 0.65 + (moleFraction.get("Cu") ?? 0) * 0.55;
    const sfeSuppressors = refractoryFraction + (moleFraction.get("Cr") ?? 0) * 0.3;
    const sfeIndex = clamp(0.18 + fcc * 0.62 + fccPromoters * 0.35 - sfeSuppressors * 0.28 + normalizedTemperature * 0.12) * 100;

    return {
      temperature: Number(temperature.toFixed(3)), liquid: Number(liquid.toFixed(8)),
      fcc: Number(fcc.toFixed(8)), bcc: Number(bcc.toFixed(8)), hcp: Number(hcp.toFixed(8)),
      intermetallic: Number(intermetallic.toFixed(8)), tcp: Number(tcp.toFixed(8)),
      gibbsMixKJMol: Number(gibbsMixKJMol.toFixed(6)), sfeIndex: Number(sfeIndex.toFixed(4)),
    };
  });

  const midpoint = points.reduce((closest, point) => (
    Math.abs(point.temperature - midpointC) < Math.abs(closest.temperature - midpointC) ? point : closest
  ), points[0]);
  const phaseRanking = phases.map((phase) => ({ phase: phase.label, fraction: midpoint[phase.key] }))
    .sort((left, right) => right.fraction - left.fraction);

  return {
    engine: { id: "iran-local-screening", version: "1.0.0", execution: "local-browser", remoteRequests: 0 },
    system: components.map((component) => component.symbol).join("–"),
    components,
    conditions: { temperatureC: [temperatureMin, temperatureMax], pressureBar: 1, points: pointCount },
    phases,
    points,
    summary: {
      weightedMeltingPointC: Number(weightedMeltingPointC.toFixed(2)),
      estimatedSolidusC: Number(estimatedSolidusC.toFixed(2)),
      estimatedLiquidusC: Number(estimatedLiquidusC.toFixed(2)),
      mixingEntropyJMolK: Number(mixingEntropyJMolK.toFixed(4)),
      mixingEnthalpyProxyKJMol: Number(mixingEnthalpyProxyKJMol.toFixed(4)),
      gibbsMixAtMidpointKJMol: midpoint.gibbsMixKJMol,
      dominantPhase: phaseRanking[0].phase,
      phaseRanking,
      intermetallicIndex: Number((intermetallicIndex * 100).toFixed(1)),
      intermetallicRisk: riskLevel(intermetallicIndex),
      tcpIndex: Number((tcpIndex * 100).toFixed(1)),
      tcpRisk: riskLevel(tcpIndex),
      solidSolutionIndex: Number(solidSolutionIndex.toFixed(1)),
      sfeIndexAtMidpoint: midpoint.sfeIndex,
    },
    warnings: [
      "Local deterministic screening model; no remote API, token, account, or network solver is used.",
      "Phase weights and transition temperatures are engineering-screening estimates, not assessed CALPHAD equilibrium results.",
      "Do not use these estimates for certification, safety-critical design, or production release without validation.",
    ],
  };
}
