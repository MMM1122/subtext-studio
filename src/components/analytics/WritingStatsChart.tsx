"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WritingSession } from "@/types";
import { dateKey } from "@/lib/utils/id";

export function WritingStatsChart({ sessions }: { sessions: WritingSession[] }) {
  const byDate = new Map(sessions.map((s) => [s.date, s]));
  const data = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const k = dateKey(d);
    const s = byDate.get(k);
    return { day: k.slice(5), added: s?.wordsAdded ?? 0, removed: s?.wordsRemoved ?? 0 };
  });
  return (
    <div className="h-32 w-full" role="img" aria-label="Words added per day over the last 14 days">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} interval={2} />
          <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--surface)" }}
            contentStyle={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, color: "var(--ink)" }}
          />
          <Bar dataKey="added" name="Added" fill="var(--accent)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
