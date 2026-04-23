"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import HistoryChart from "@/components/history-chart";
import { format } from "date-fns";

export default function DashboardPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadScans = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const patientId = session?.user?.id || "00000000-0000-0000-0000-000000000000";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Your analysis history and insights
              </p>
            </div>
          </div>
        </div>

        {safeScans.length === 0 ? (
          /* Empty state */
          <Card className="glass border-border/40">
            <CardHeader className="text-center py-16">
              <CardTitle className="text-xl">No analyses yet</CardTitle>
              <CardDescription className="mt-2 text-base">
                Upload a medical image to get started with your first analysis.
              </CardDescription>
              <div className="mt-6">
                <Link href="/#upload">
                  <Button className="gap-2">
                    Start Analyzing
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            {/* Chart Section */}
            <Card className="lg:col-span-3 glass border-border/40">
              <CardHeader>
                <CardTitle className="text-xl">Infection Probability</CardTitle>
                <CardDescription>
                  Your respiratory infection risk over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HistoryChart scans={safeScans} />
              </CardContent>
            </Card>

            {/* Table Section */}
            <Card className="lg:col-span-3 glass border-border/40">
              <CardHeader>
                <CardTitle className="text-xl">Past Scans</CardTitle>
                <CardDescription>
                  A history of all your uploaded medical images
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-card/40">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Prediction</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Inference Time</TableHead>
                        <TableHead>Clinical Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeScans.map((scan) => {
                        const isPneumonia = scan.prediction === "Pneumonia";
                        return (
                          <TableRow key={scan.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(scan.created_at), "MMM dd, yyyy")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                isPneumonia ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"
                              }`}>
                                {isPneumonia ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {scan.prediction}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(scan.confidence * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              {scan.inference_time ? `${scan.inference_time} ms` : "N/A"}
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="text-xs text-muted-foreground line-clamp-2" title={scan.summary || "No summary available."}>
                                {scan.summary || "No summary available."}
                              </p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
