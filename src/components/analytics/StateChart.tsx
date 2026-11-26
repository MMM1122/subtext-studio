"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Chapter, CharacterState } from "@/types";

const COLORS = ["var(--c-sage)", "var(--c-clay)", "var(--c-slate)", "var(--c-sand)", "var(--c-plum)", "var(--c-teal)"];

/** Plots author-defined numeric state variables across chapters. */
export function StateChart({ states, chapters }: { states: CharacterState[]; chapters: Chapter[] }) {
  const names = Array.from(
    new Set(states.flatMap((s) => s.variables.filter((v) => v.name.trim() && v.value.trim() !== "" && !isNaN(Number(v.value))).map((v) => v.name.trim()))),
  ).slice(0, 6);
  const data = chapters.map((ch, i) => {
    const row: Record<string, string | number | null> = { chapter: `Ch ${i + 1}` };
    const s = states.find((x) => x.chapterId === ch.id);
    for (const n of names) {
      const v = s?.variables.find((x) => x.name.trim() === n);
      row[n] = v && v.value.trim() !== "" && !isNaN(Number(v.value)) ? Number(v.value) : null;
    }
    return row;
  });
  return (
    <div className="h-52 w-full" role="img" aria-label="Character variables across chapters">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="chapter" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {names.map((n, i) => (
            <Line key={n} type="monotone" dataKey={n} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
