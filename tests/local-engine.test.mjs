import assert from "node:assert/strict";
import test from "node:test";
import { runLocalMulticomponentStudy } from "../app/localMulticomponent.ts";

const elements = [
  { symbol: "Fe", atomicMass: "55.845", meltingPoint: 1811, density: 7.874, groupBlock: "transition metal" },
  { symbol: "Cr", atomicMass: "51.9961", meltingPoint: 2180, density: 7.19, groupBlock: "transition metal" },
  { symbol: "Ni", atomicMass: "58.6934", meltingPoint: 1728, density: 8.908, groupBlock: "transition metal" },
  { symbol: "Mo", atomicMass: "95.95", meltingPoint: 2896, density: 10.28, groupBlock: "transition metal" },
];

const components = [
  { symbol: "Fe", wtPercent: 69.5 },
  { symbol: "Cr", wtPercent: 18 },
  { symbol: "Ni", wtPercent: 10 },
  { symbol: "Mo", wtPercent: 2.5 },
];

test("runs a deterministic multicomponent study entirely in-process", () => {
  const options = { coolingRateKPerS: 12, grainSizeMicron: 40, strainRatePerS: 0.2 };
  const first = runLocalMulticomponentStudy(components, elements, 500, 1700, options);
  const second = runLocalMulticomponentStudy(components, elements, 500, 1700, options);

  assert.deepEqual(first, second);
  assert.equal(first.engine.execution, "browser");
  assert.equal(first.engine.remoteRequests, 0);
  assert.equal(first.points.length, 48);
  assert.equal(first.properties.length, 48);
  assert.equal(first.components.length, 4);
  assert.equal(first.conditions.coolingRateKPerS, 12);
  assert.ok(first.summary.estimatedSolidusC < first.summary.estimatedLiquidusC);
  assert.ok(first.summary.tcpIndex >= 0 && first.summary.tcpIndex <= 100);
});

test("normalizes every phase row and keeps all local outputs finite", () => {
  const result = runLocalMulticomponentStudy(components, elements, 500, 1700);
  const phaseKeys = result.phases.map((phase) => phase.key);

  for (const point of result.points) {
    const total = phaseKeys.reduce((sum, key) => sum + point[key], 0);
    assert.ok(Math.abs(total - 1) < 1e-6, `phase weights sum to ${total} at ${point.temperature} °C`);
    assert.ok(Number.isFinite(point.gibbsMixKJMol));
    assert.ok(point.sfeIndex >= 0 && point.sfeIndex <= 100);
    for (const key of phaseKeys) assert.ok(point[key] >= 0 && point[key] <= 1);
  }

  for (const property of result.properties) {
    assert.ok(property.densityKgM3 > 0);
    assert.ok(property.specificHeatJKgK > 0);
    assert.ok(property.thermalConductivityWMK > 0);
    assert.ok(property.youngsModulusGPa > 0);
    assert.ok(property.yieldStrengthMPa >= 0);
    assert.ok(property.hardnessHV >= 0);
  }

  assert.ok(result.summary.coolingTimeSeconds > 0);
  assert.ok(result.summary.rapidTransformationIndex >= 0 && result.summary.rapidTransformationIndex <= 100);
  assert.ok(result.summary.diffusiveTransformationIndex >= 0 && result.summary.diffusiveTransformationIndex <= 100);
});

test("rejects invalid local study definitions", () => {
  assert.throws(() => runLocalMulticomponentStudy([{ symbol: "Fe", wtPercent: 100 }], elements, 500, 400));
});
