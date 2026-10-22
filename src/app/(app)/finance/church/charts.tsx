"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, type Cents } from "@/lib/finance/money";
import { TYPE_LABELS, TYPES } from "@/lib/finance/totals";

/**
 * The church page's two charts. Both are drawn from series the server
 * computed from the same rows as the table below them, so their totals agree.
 * Colours are the theme's chart tokens, so they follow light and dark mode;
 * the dark navy token is skipped because it vanishes on the dark canvas.
 */

const COLOURS: Record<(typeof TYPES)[number], string> = {
  CHEMA: "var(--chart-1)",
  WELFARE: "var(--chart-2)",
  TITHE: "var(--chart-3)",
  PARTNERSHIP: "var(--chart-4)",
};

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const dollars = (cents: number) => formatMoney(cents).replace(/\.00$/, "");

const tooltip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--popover-foreground)",
  },
  formatter: (value: unknown) => formatMoney(Number(value ?? 0)),
};

export function GroupBarChart({
  data,
}: {
  data: ({ group: string } & Record<(typeof TYPES)[number], Cents>)[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="group"
            tick={axis}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={axis} tickFormatter={dollars} width={64} axisLine={false} tickLine={false} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--muted)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {TYPES.map((type) => (
            <Bar
              key={type}
              dataKey={type}
              name={TYPE_LABELS[type]}
              stackId="type"
              fill={COLOURS[type]}
              // Thin marks, and a 2 px surface gap between stacked segments, so
              // touching colours never have to be told apart by hue alone.
              maxBarSize={40}
              stroke="var(--card)"
              strokeWidth={2}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyLineChart({ data }: { data: { month: string; cents: Cents }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="month" tick={axis} />
          <YAxis tick={axis} tickFormatter={dollars} width={64} axisLine={false} tickLine={false} />
          <Tooltip {...tooltip} />
          <Line
            type="monotone"
            dataKey="cents"
            name="Confirmed"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
