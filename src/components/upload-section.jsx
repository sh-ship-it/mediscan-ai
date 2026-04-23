"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  ImagePlus,
  ScanLine,
  X,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  FileDown,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { saveScanResult } from "@/actions/scan";
import { generateClinicalSummary } from "@/actions/summary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UploadSection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null); // { prediction, confidence, summary, heatmap }
  const [error, setError] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleFile = useCallback((selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e) => {
      const selectedFile = e.target.files[0];
      handleFile(selectedFile);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowHeatmap(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      // ── 1. Upload to Supabase Storage ─────────────────────────────
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("scans")
        .upload(`public/${fileName}`, file);

      let publicUrl = null;
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("scans")
          .getPublicUrl(`public/${fileName}`);
        publicUrl = urlData.publicUrl;
      } else {
        console.warn("Storage upload failed, proceeding without URL:", uploadError);
      }

      // ── 2. Call FastAPI Backend for Inference ─────────────────────
      const formData = new FormData();
      formData.append("file", file);

      // Directly call FastAPI since we just need standard prediction now
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `Server responded with ${res.status}`);
      }

      // ── 3. Generate Clinical Summary via Groq ─────────────────────
      const summaryRes = await generateClinicalSummary(data.prediction, data.confidence);
      const clinicalSummary = summaryRes.success ? summaryRes.summary : null;

      // ── 4. Save Result via Server Action ──────────────────────────
      // Use the real logged-in user's ID if available, else use the dummy fallback
      const patientId = user?.id || "00000000-0000-0000-0000-000000000000"; 
      
      const saveRes = await saveScanResult(
        patientId,
        publicUrl,
        data.prediction,
        data.confidence,
        data.inference_time,
        clinicalSummary
      );

      if (saveRes.success) {
        toast.success("Analysis complete!", {
          description: "Result has been saved to your patient record.",
        });
      } else {
        toast.error("Failed to save record", {
          description: saveRes.error,
        });
      }

      // ── 5. Update UI State ────────────────────────────────────────
      setResult({ ...data, summary: clinicalSummary });
    } catch (err) {
      console.error("Analysis failed:", err);
      toast.error("Analysis Failed", {
        description: err.message === "Failed to fetch"
          ? "Cannot reach the AI server. Is it running?"
          : err.message
      });
      setError(
        err.message === "Failed to fetch"
          ? "Cannot reach the AI server. Is the FastAPI backend running on port 8000?"
          : err.message
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, user]);

  const isPneumonia = result?.prediction === "Pneumonia";
  const confidencePct = result ? (result.confidence * 100).toFixed(1) : 0;

  const handleGeneratePDF = () => {
    toast.info("Opening PDF print dialog...");
    // We use a small timeout to allow the toast to render before the print dialog freezes the page
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <section id="upload" className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-gradient-to-t from-[oklch(0.5_0.08_180/6%)] to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section heading */}
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm backdrop-blur-sm">
            <ScanLine className="h-3.5 w-3.5 text-chart-2" />
            <span className="text-muted-foreground">Medical Image Analysis</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Upload &amp; Analyze
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Drag and drop your medical image below for instant AI-powered
            analysis.
          </p>
        </div>

        {/* Upload Card */}
        <Card className="glass border-border/40 shadow-2xl shadow-black/10 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ImagePlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Image Upload</CardTitle>
                <CardDescription>
                  Supports JPEG, PNG, DICOM formats up to 50MB
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : preview
                  ? "border-border/40 bg-card/40"
                  : "border-border/60 bg-card/20 hover:border-primary/40 hover:bg-primary/[0.02]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.dcm"
                onChange={handleInputChange}
                className="hidden"
                id="file-upload"
              />

              {preview ? (
                /* Preview state */
                <div className="relative p-4">
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={showHeatmap && result?.heatmap ? result.heatmap : preview}
                      alt="Medical image preview"
                      className="w-full h-64 object-contain bg-black/20 rounded-lg transition-all duration-300"
                    />
                    {/* Scan line animation */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-chart-2 to-transparent"
                          style={{
                            animation: "scanLine 2s ease-in-out infinite",
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Heatmap Toggle Button */}
                    {result?.heatmap && (
                      <div className="absolute bottom-3 right-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2 shadow-lg glass"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHeatmap(!showHeatmap);
                          }}
                        >
                          <Layers className="h-4 w-4" />
                          {showHeatmap ? "Show Original" : "Show AI Heatmap"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* File info */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {file?.name}
                      </span>
                      <span className="text-muted-foreground/60">
                        ({(file?.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center gap-4 p-12 sm:p-16">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/40">
                      <Upload className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 blur-xl animate-pulse-slow" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="font-medium text-foreground">
                      Drop your medical image here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or{" "}
                      <span className="text-primary underline underline-offset-2">
                        browse files
                      </span>{" "}
                      from your computer
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Analyze button */}
            <Button
              onClick={analyzeImage}
              disabled={!file || isAnalyzing}
              size="lg"
              className="w-full gap-2 py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Image...
                </>
              ) : (
                <>
                  <ScanLine className="h-5 w-5" />
                  Analyze Image
                </>
              )}
            </Button>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {["HIPAA Compliant", "End-to-End Encrypted", "Real-time Results"].map(
                (feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center rounded-full border border-border/40 bg-card/40 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {feature}
                  </span>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Results Card ─────────────────────────────────────────── */}
        {result && (
          <Card className="glass border-border/40 shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isPneumonia
                        ? "bg-destructive/15 text-destructive"
                        : "bg-green-500/15 text-green-500"
                    }`}
                  >
                    {isPneumonia ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl">Analysis Results</CardTitle>
                    <CardDescription>
                      MobileNetV2 inference + Groq clinical summary
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                    Save PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={clearFile}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    New Scan
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent id="report-content" className="space-y-5 bg-card">
              {/* Prediction + Confidence row */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Prediction */}
                <div
                  className={`rounded-xl border p-4 ${
                    isPneumonia
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-green-500/30 bg-green-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Prediction
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      isPneumonia ? "text-destructive" : "text-green-500"
                    }`}
                  >
                    {result.prediction}
                  </p>
                </div>

                {/* Confidence */}
                <div className="rounded-xl border border-border/40 bg-card/40 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Confidence
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold font-mono">
                      {confidencePct}
                    </p>
                    <span className="text-lg text-muted-foreground">%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isPneumonia
                          ? "bg-destructive"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Inference Time details */}
              {result.inference_time && (
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Inference Time:</span>
                    <span className="font-medium">{result.inference_time} ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Computed on:</span>
                    <span className="font-medium uppercase tracking-widest text-muted-foreground/60 bg-muted/50 rounded-full px-2 py-0.5 text-[10px]">CPU</span>
                  </div>
                </div>
              )}

              {/* Clinical Summary from Groq */}
              {result.summary && (
                <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-chart-1" />
                    <span className="text-sm font-semibold">
                      AI Clinical Summary
                    </span>
                    <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 bg-muted/50 rounded-full px-2 py-0.5" title="Powered by Llama 3.3 70B via Groq">
                      Groq
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {result.summary}
                  </p>
                </div>
              )}

              {/* If Groq failed but prediction succeeded */}
              {!result.summary && (
                <div className="rounded-xl border border-border/30 bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      Clinical summary unavailable — check your GROQ_API_KEY.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scan-line keyframes */}
      <style jsx>{`
        @keyframes scanLine {
          0% {
            top: -2px;
          }
          50% {
            top: 100%;
          }
          100% {
            top: -2px;
          }
        }
      `}</style>
    </section>
  );
}
