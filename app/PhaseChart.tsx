"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChartRow = { temperature: number; [key: string]: number };
type Phase = { key: string; label: string; color: string };

type PhaseChartProps = {
  data: ChartRow[];
  phases: Phase[];
  temperatureMin: number;
  temperatureMax: number;
  systemName: string;
};

const yTicks = [0, 0.25, 0.5, 0.75, 1];

export default function PhaseChart({ data, phases, temperatureMin, temperatureMax, systemName }: PhaseChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 760, height: 360 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sortedData = useMemo(() => [...data].sort((left, right) => left.temperature - right.temperature), [data]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setSize({ width: Math.max(280, rect.width), height: Math.max(240, rect.height) });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const padding = { top: 22, right: 24, bottom: 42, left: 54 };
  const plotWidth = Math.max(1, size.width - padding.left - padding.right);
  const plotHeight = Math.max(1, size.height - padding.top - padding.bottom);
  const temperatureSpan = Math.max(1, temperatureMax - temperatureMin);
  const xFor = (temperature: number) => padding.left + ((temperature - temperatureMin) / temperatureSpan) * plotWidth;
  const yFor = (value: number) => padding.top + (1 - value) * plotHeight;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(temperatureMin + ratio * temperatureSpan));
  const activePoint = activeIndex === null ? null : sortedData[Math.min(activeIndex, sortedData.length - 1)];

  const moveToPointer = (clientX: number, boundsLeft: number) => {
    if (!sortedData.length) return;
    const localX = Math.min(size.width - padding.right, Math.max(padding.left, clientX - boundsLeft));
    const ratio = (localX - padding.left) / plotWidth;
    setActiveIndex(Math.round(ratio * (sortedData.length - 1)));
  };

  const moveByKeyboard = (direction: -1 | 1) => {
    setActiveIndex((current) => {
      const start = current ?? Math.floor(sortedData.length / 2);
      return Math.min(sortedData.length - 1, Math.max(0, start + direction));
    });
  };

  return (
    <div className="phase-chart" ref={containerRef}>
      <svg
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        tabIndex={0}
        aria-label={`${systemName} normalized heuristic phase weights from ${temperatureMin} to ${temperatureMax} degrees Celsius. Use the left and right arrow keys to inspect values.`}
        onMouseMove={(event) => moveToPointer(event.clientX, event.currentTarget.getBoundingClientRect().left)}
        onMouseLeave={() => setActiveIndex(null)}
        onFocus={() => setActiveIndex((current) => current ?? Math.floor(sortedData.length / 2))}
        onBlur={() => setActiveIndex(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveByKeyboard(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveByKeyboard(1);
          }
        }}
      >
        <title>{systemName} phase-weight chart</title>
        <desc>Educational heuristic phase weights. Values range from zero to one.</desc>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line className="chart-grid-line" x1={padding.left} x2={size.width - padding.right} y1={yFor(tick)} y2={yFor(tick)} />
            <text className="chart-axis-label" x={padding.left - 10} y={yFor(tick) + 4} textAnchor="end">{tick}</text>
          </g>
        ))}
        <line className="chart-axis-line" x1={padding.left} x2={size.width - padding.right} y1={size.height - padding.bottom} y2={size.height - padding.bottom} />
        {xTicks.map((tick) => (
          <text className="chart-axis-label" key={tick} x={xFor(tick)} y={size.height - 15} textAnchor="middle">{tick}°</text>
        ))}

        {phases.map((phase) => {
          const path = sortedData.map((row, index) => `${index === 0 ? "M" : "L"}${xFor(row.temperature).toFixed(2)},${yFor(row[phase.key] ?? 0).toFixed(2)}`).join(" ");
          return <path className="chart-series" key={phase.key} d={path} stroke={phase.color} />;
        })}

        {activePoint && (
          <g aria-hidden="true">
            <line className="chart-cursor" x1={xFor(activePoint.temperature)} x2={xFor(activePoint.temperature)} y1={padding.top} y2={size.height - padding.bottom} />
            {phases.map((phase) => <circle key={phase.key} cx={xFor(activePoint.temperature)} cy={yFor(activePoint[phase.key] ?? 0)} r="4" fill="white" stroke={phase.color} strokeWidth="2" />)}
          </g>
        )}
      </svg>

      {activePoint && (
        <div
          className="chart-tooltip"
          role="status"
          style={{
            left: `${Math.min(82, Math.max(18, (xFor(activePoint.temperature) / size.width) * 100))}%`,
            top: `${Math.min(70, Math.max(18, (yFor(Math.max(...phases.map((phase) => activePoint[phase.key] ?? 0))) / size.height) * 100))}%`,
          }}
        >
          <strong>{activePoint.temperature} °C</strong>
          {phases.map((phase) => (
            <span key={phase.key}><i style={{ backgroundColor: phase.color }} />{phase.label}<b>{((activePoint[phase.key] ?? 0) * 100).toFixed(1)}%</b></span>
          ))}
        </div>
      )}
    </div>
  );
}
