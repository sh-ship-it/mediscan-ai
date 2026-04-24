"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, LayoutDashboard, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { supabase } from "@/lib/supabase";
import HistoryChart from "@/components/history-chart";
import { format } from "date-fns";
import Navbar from "@/components/navbar";

export default function DashboardPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScans = async () => {
      const patientId = "00000000-0000-0000-0000-000000000000";

      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setScans(data);
      }
      setLoading(false);
    };

    loadScans();
  }, []);

  const safeScans = scans || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-500 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link href="/">
            <RainbowButton size="icon" className="h-10 w-10 border-2 border-black hover:bg-gray-100 rounded-full px-0 py-0">
              <ArrowLeft className="h-5 w-5 text-black" />
            </RainbowButton>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 border-2 border-gray-300">
              <LayoutDashboard className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-black">Dashboard</h1>
              <p className="text-base text-gray-500">
                Your analysis history and insights
              </p>
            </div>
          </div>
        </div>

        {safeScans.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border-2 border-black bg-white">
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-black">No analyses yet</h2>
              <p className="mt-3 text-lg text-gray-500">
                Upload a medical image to get started with your first analysis.
              </p>
              <div className="mt-8">
                <Link href="/#upload">
                  <RainbowButton className="gap-2 text-base px-8 py-6 h-14 rounded-xl w-full max-w-[250px]">
                    Start Analyzing
                  </RainbowButton>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1">
            {/* Chart Section */}
            <div className="rounded-2xl border-2 border-black bg-white overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-black">Infection Probability</h2>
                <p className="text-base text-gray-500">
                  Your respiratory infection risk over time
                </p>
              </div>
              <div className="p-6">
                <HistoryChart scans={safeScans} />
              </div>
            </div>

            {/* Table Section */}
            <div className="rounded-2xl border-2 border-black bg-white overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-black">Past Scans</h2>
                <p className="text-base text-gray-500">
                  A history of all your uploaded medical images
                </p>
              </div>
              <div className="p-6">
                <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-bold text-black uppercase tracking-wider">Date</th>
                        <th className="text-left px-4 py-3 text-sm font-bold text-black uppercase tracking-wider">Prediction</th>
                        <th className="text-left px-4 py-3 text-sm font-bold text-black uppercase tracking-wider">Confidence</th>
                        <th className="text-left px-4 py-3 text-sm font-bold text-black uppercase tracking-wider">Processing Time</th>
                        <th className="text-left px-4 py-3 text-sm font-bold text-black uppercase tracking-wider">Clinical Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {safeScans.map((scan) => {
                        const isPneumonia = scan.prediction === "Pneumonia";
                        return (
                          <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-base text-black">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                {format(new Date(scan.created_at), "MMM dd, yyyy")}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                                isPneumonia ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                              }`}>
                                {isPneumonia ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {scan.prediction}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-base font-semibold text-black">
                              {(scan.confidence * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-4 text-base text-gray-700">
                              {scan.inference_time ? `${scan.inference_time} ms` : "N/A"}
                            </td>
                            <td className="px-4 py-4 max-w-[300px]">
                              <p className="text-sm text-gray-600 line-clamp-2" title={scan.summary || "No summary available."}>
                                {scan.summary || "No summary available."}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
