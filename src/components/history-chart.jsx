"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export default function HistoryChart({ scans }) {
  // We need to reverse the scans to show chronological order (oldest to newest)
  const data = [...scans].reverse().map((scan) => {
    // Determine the infection probability.
    // If prediction is Pneumonia, probability is confidence.
    // If prediction is Normal, probability is 1 - confidence.
    const probability =
      scan.prediction === "Pneumonia"
        ? scan.confidence * 100
        : (1 - scan.confidence) * 100;

    return {
      date: format(new Date(scan.created_at), "MMM dd, HH:mm"),
      probability: parseFloat(probability.toFixed(1)),
      prediction: scan.prediction,
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.28 0.012 75 / 40%)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "oklch(0.65 0.012 75)", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "oklch(0.65 0.012 75)", fontSize: 12 }}
            domain={[0, 100]}
            unit="%"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border/40 bg-card p-3 shadow-lg">
                    <p className="text-sm font-medium mb-1">{data.date}</p>
                    <p className="text-xs text-muted-foreground">
                      Probability: <span className="font-bold text-foreground">{data.probability}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prediction: <span className="font-bold text-foreground">{data.prediction}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="probability"
            stroke="oklch(0.5 0.08 180)"
            strokeWidth={3}
            dot={{ r: 4, fill: "oklch(0.5 0.08 180)", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "oklch(0.85 0.015 75)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
