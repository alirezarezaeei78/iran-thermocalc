export type LocalElement = {
  symbol: string;
  atomicMass: string | number;
  meltingPoint: string | number;
  density?: string | number;
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

export type LocalPropertyPoint = {
  temperature: number;
  densityKgM3: number;
  specificHeatJKgK: number;
  thermalConductivityWMK: number;
  thermalExpansionMicrostrainK: number;
  youngsModulusGPa: number;
  yieldStrengthMPa: number;
  hardnessHV: number;
};

export type LocalStudyOptions = {
  coolingRateKPerS?: number;
  grainSizeMicron?: number;
  strainRatePerS?: number;
};

export type LocalStudyResult = {
  engine: {
    id: "iran-calculation-engine";
    version: "1.0.0";
    execution: "browser";
    remoteRequests: 0;
  };
  system: string;
  components: Array<LocalStudyComponent & { moleFraction: number }>;
  conditions: { temperatureC: [number, number]; pressureBar: 1; points: number; coolingRateKPerS: number; grainSizeMicron: number; strainRatePerS: number };
  phases: Array<{ key: "liquid" | "fcc" | "bcc" | "hcp" | "intermetallic" | "tcp"; label: string; color: string }>;
  points: LocalPhasePoint[];
  properties: LocalPropertyPoint[];
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
    densityAtMidpointKgM3: number;
    thermalConductivityAtMidpointWMK: number;
    specificHeatAtMidpointJKgK: number;
    youngsModulusAtMidpointGPa: number;
    yieldStrengthAtMidpointMPa: number;
    hardnessAtMidpointHV: number;
    coolingTimeSeconds: number;
    rapidTransformationIndex: number;
    diffusiveTransformationIndex: number;
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

const thermalConductivityWMK: Record<string, number> = {
  Ag: 429, Al: 237, Au: 318, Co: 100, Cr: 94, Cu: 401, Fe: 80, Mg: 156,
  Mo: 139, Ni: 91, Si: 149, Ta: 57, Ti: 22, V: 31, W: 174, Zr: 23,
};

const youngsModulusGPa: Record<string, number> = {
  Al: 69, Co: 209, Cr: 279, Cu: 117, Fe: 211, Mg: 45, Mo: 329, Ni: 200,
  Si: 130, Ta: 186, Ti: 116, V: 128, W: 411, Zr: 88,
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
  options: LocalStudyOptions = {},
): LocalStudyResult {
  const totalWeight = inputComponents.reduce((sum, component) => sum + Math.max(0, component.wtPercent), 0);
  if (inputComponents.length < 2 || totalWeight <= 0 || temperatureMin >= temperatureMax) {
    throw new Error("A local study needs at least two components, positive composition, and an increasing temperature range.");
  }

  const elementMap = new Map(elements.map((element) => [element.symbol, element]));
  const coolingRateKPerS = clamp(options.coolingRateKPerS ?? 10, 0.01, 10000);
  const grainSizeMicron = clamp(options.grainSizeMicron ?? 50, 1, 1000);
  const strainRatePerS = clamp(options.strainRatePerS ?? 0.1, 0.0001, 1000);
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

  const roomDensityKgM3 = 1000 / normalized.reduce((sum, component) => {
    const density = parseNumeric(elementMap.get(component.symbol)?.density ?? 0, component.symbol === "Al" ? 2.7 : component.symbol === "Mg" ? 1.74 : component.symbol === "Ti" ? 4.51 : 7.8);
    return sum + component.wtPercent / 100 / density;
  }, 0);
  const roomConductivity = components.reduce((sum, component) => sum + component.moleFraction * (thermalConductivityWMK[component.symbol] ?? 45), 0);
  const roomModulus = components.reduce((sum, component) => sum + component.moleFraction * (youngsModulusGPa[component.symbol] ?? 150), 0);
  const lightMetalFraction = (moleFraction.get("Al") ?? 0) + (moleFraction.get("Mg") ?? 0) + (moleFraction.get("Ti") ?? 0) * 0.4;
  const baseExpansion = 10.5 + 12 * lightMetalFraction + 2.5 * entropyRatio;
  const strengthening = 1 + intermetallicIndex * 0.45 + tcpIndex * 0.22 + Math.log10(strainRatePerS + 1) * 0.08;
  const grainStrengthFactor = 1 + 0.32 / Math.sqrt(grainSizeMicron / 10);

  const properties: LocalPropertyPoint[] = points.map((point) => {
    const relativeTemperature = clamp((point.temperature - 20) / Math.max(estimatedLiquidusC - 20, 1));
    const phaseSoftening = 1 - point.liquid * 0.92;
    const densityKgM3 = roomDensityKgM3 / (1 + 3 * baseExpansion * 1e-6 * (point.temperature - 20)) * (1 - point.liquid * 0.045);
    const solidificationPeak = gaussian(point.temperature, (estimatedSolidusC + estimatedLiquidusC) / 2, Math.max(30, (estimatedLiquidusC - estimatedSolidusC) / 2));
    const specificHeatJKgK = 370 + lightMetalFraction * 310 + point.temperature * 0.13 + solidificationPeak * 180;
    const thermalConductivity = roomConductivity * (1 - 0.42 * relativeTemperature) * (1 - intermetallicIndex * 0.12) * (1 - point.liquid * 0.16);
    const modulus = roomModulus * Math.max(0.025, 1 - 0.72 * relativeTemperature) * phaseSoftening;
    const baseYield = (125 + 260 * (1 - lightMetalFraction) + 190 * intermetallicIndex + 90 * tcpIndex) * grainStrengthFactor * strengthening;
    const yieldStrength = baseYield * Math.max(0.015, Math.pow(1 - relativeTemperature, 1.35)) * phaseSoftening;
    return {
      temperature: point.temperature,
      densityKgM3: Number(densityKgM3.toFixed(2)),
      specificHeatJKgK: Number(specificHeatJKgK.toFixed(2)),
      thermalConductivityWMK: Number(Math.max(0.1, thermalConductivity).toFixed(3)),
      thermalExpansionMicrostrainK: Number((baseExpansion * (1 + relativeTemperature * 0.18)).toFixed(3)),
      youngsModulusGPa: Number(Math.max(0.1, modulus).toFixed(3)),
      yieldStrengthMPa: Number(Math.max(0, yieldStrength).toFixed(2)),
      hardnessHV: Number(Math.max(0, yieldStrength / 3.05).toFixed(2)),
    };
  });
  const midpointProperty = properties.reduce((closest, point) => (
    Math.abs(point.temperature - midpointC) < Math.abs(closest.temperature - midpointC) ? point : closest
  ), properties[0]);
  const rateFactor = clamp((Math.log10(coolingRateKPerS) + 2) / 6);
  const rapidTransformationIndex = clamp(rateFactor * (0.55 + baseBcc / Math.max(baseFcc + baseBcc + baseHcp, 0.1)) + tcpIndex * 0.12) * 100;
  const diffusiveTransformationIndex = clamp(1 - rapidTransformationIndex / 100 - pointCount / 1000) * 100;
  const coolingTimeSeconds = (temperatureMax - temperatureMin) / coolingRateKPerS;

  return {
    engine: { id: "iran-calculation-engine", version: "1.0.0", execution: "browser", remoteRequests: 0 },
    system: components.map((component) => component.symbol).join("–"),
    components,
    conditions: { temperatureC: [temperatureMin, temperatureMax], pressureBar: 1, points: pointCount, coolingRateKPerS, grainSizeMicron, strainRatePerS },
    phases,
    points,
    properties,
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
      densityAtMidpointKgM3: midpointProperty.densityKgM3,
      thermalConductivityAtMidpointWMK: midpointProperty.thermalConductivityWMK,
      specificHeatAtMidpointJKgK: midpointProperty.specificHeatJKgK,
      youngsModulusAtMidpointGPa: midpointProperty.youngsModulusGPa,
      yieldStrengthAtMidpointMPa: midpointProperty.yieldStrengthMPa,
      hardnessAtMidpointHV: midpointProperty.hardnessHV,
      coolingTimeSeconds: Number(coolingTimeSeconds.toFixed(3)),
      rapidTransformationIndex: Number(rapidTransformationIndex.toFixed(1)),
      diffusiveTransformationIndex: Number(diffusiveTransformationIndex.toFixed(1)),
    },
    warnings: [
      "Phase weights, properties and transition temperatures are engineering model estimates.",
      "Validate certification, safety-critical design and production-release decisions against qualified reference data.",
    ],
  };
}
