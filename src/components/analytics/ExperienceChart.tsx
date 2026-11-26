"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricKey } from "@/types";
import { METRIC_LABEL } from "@/features/reader/logic";

export const METRIC_COLOR: Record<MetricKey, string> = {
  emotionalIntensity: "var(--c-clay)",
  tension: "var(--c-slate)",
  suspense: "var(--c-plum)",
  uncertainty: "var(--c-sand)",
  informationDensity: "var(--c-teal)",
  pacing: "var(--c-sage)",
};

export function ExperienceChart({ data, keys }: { data: Record<string, string | number | null>[]; keys: MetricKey[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Author-estimated reader experience across chapters">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, color: "var(--ink)" }}
            labelFormatter={(_, p) => String((p?.[0]?.payload as { title?: string })?.title ?? "")}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {keys.map((k) => (
            <Line key={k} type="monotone" dataKey={k} name={METRIC_LABEL[k]} stroke={METRIC_COLOR[k]} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
