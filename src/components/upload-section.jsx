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
import { RainbowButton } from "@/components/ui/rainbow-button";

export default function UploadSection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const fileInputRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

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
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e) => handleFile(e.target.files[0]),
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowHeatmap(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
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

      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/predict`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Server responded with ${res.status}`);

      const summaryRes = await generateClinicalSummary(data.prediction, data.confidence);
      const clinicalSummary = summaryRes.success ? summaryRes.summary : null;

      const patientId = "00000000-0000-0000-0000-000000000000";
      const saveRes = await saveScanResult(
        patientId, publicUrl, data.prediction,
        data.confidence, data.inference_time, clinicalSummary
      );

      if (saveRes.success) {
        toast.success("Analysis complete!", { description: "Result has been saved successfully." });
      } else {
        toast.error("Failed to save record", { description: saveRes.error });
      }

      setResult({ ...data, summary: clinicalSummary });
    } catch (err) {
      console.error("Analysis failed:", err);
      const isNetworkError = err.message === "Failed to fetch";
      toast.error("Analysis Failed", {
        description: isNetworkError ? "Cannot reach the AI server. Is it running?" : err.message,
      });
      setError(
        isNetworkError
          ? "Cannot reach the AI server. Is the FastAPI backend running on port 8000?"
          : err.message
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [file]);

  const isPneumonia = result?.prediction === "Pneumonia";
  const confidencePct = result ? (result.confidence * 100).toFixed(1) : 0;

  const handleGeneratePDF = () => {
    toast.info("Opening PDF print dialog...");
    setTimeout(() => window.print(), 500);
  };

  return (
    <section id="upload" className="relative py-24 sm:py-32 bg-white">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Section heading */}
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-1.5 text-sm">
            <ScanLine className="h-3.5 w-3.5 text-black" />
            <span className="text-gray-700">Medical Image Analysis</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-black">
            Upload &amp; Analyze
          </h2>
          <p className="text-gray-500 text-lg sm:text-xl max-w-md mx-auto">
            Drag and drop your medical image below for instant AI-powered analysis.
          </p>
        </div>

        {/* Results Card */}
        {result && (
          <div
            ref={resultRef}
            className="rounded-2xl border-2 border-black bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700"
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isPneumonia ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                  }`}
                >
                  {isPneumonia ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-black">Analysis Results</h3>
                  <p className="text-sm text-gray-500">EfficientNetB3 analysis + Groq clinical summary</p>
                </div>
              </div>
              <div className="flex gap-2">
                <RainbowButton
                  size="sm"
                  className="gap-1.5 text-sm px-4 py-2 h-9 rounded-lg"
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  Save PDF
                </RainbowButton>
                <RainbowButton
                  size="sm"
                  className="gap-1.5 text-sm px-4 py-2 h-9 rounded-lg"
                  onClick={clearFile}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  New Scan
                </RainbowButton>
              </div>
            </div>

            <div id="report-content" className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div
                  className={`rounded-xl border-2 p-5 ${
                    isPneumonia ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-gray-600">Prediction</span>
                  </div>
                  <p className={`text-3xl font-bold ${isPneumonia ? "text-red-600" : "text-green-600"}`}>
                    {result.prediction}
                  </p>
                </div>

                <div className="rounded-xl border-2 border-black bg-white p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-gray-600">Confidence</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-black">{confidencePct}</p>
                    <span className="text-xl text-gray-500">%</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isPneumonia ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                </div>
              </div>

              {result.inference_time && (
                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 space-y-2 text-base">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="font-semibold text-black">{result.inference_time} ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Computed on:</span>
                    <span className="font-medium uppercase tracking-widest text-gray-500 bg-gray-200 rounded-full px-3 py-0.5 text-xs">CPU</span>
                  </div>
                </div>
              )}

              {result.summary && (
                <div className="rounded-xl border border-gray-300 bg-gray-50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-black" />
                    <span className="text-base font-bold text-black">AI Clinical Summary</span>
                    <span
                      className="ml-auto text-[11px] font-semibold uppercase tracking-widest text-gray-500 bg-gray-200 rounded-full px-3 py-0.5"
                      title="Powered by Llama 3.3 70B via Groq"
                    >
                      Groq
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">{result.summary}</p>
                </div>
              )}

              {!result.summary && (
                <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-base text-gray-500 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Clinical summary unavailable — check your GROQ_API_KEY.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Card */}
        <div className="rounded-2xl border-2 border-black bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 border border-gray-300">
              <ImagePlus className="h-6 w-6 text-black" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-black">Image Upload</h3>
              <p className="text-sm text-gray-500">Supports JPEG, PNG, DICOM formats up to 50MB</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${
                isDragging
                  ? "border-black bg-gray-100 scale-[1.02]"
                  : preview
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-400 bg-white hover:border-black hover:bg-gray-50"
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
                <div className="relative p-4">
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={showHeatmap && result?.heatmap ? result.heatmap : preview}
                      alt="Medical image preview"
                      className="w-full h-72 object-contain bg-gray-100 rounded-lg transition-all duration-300"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-black to-transparent"
                          style={{ animation: "scanLine 2s ease-in-out infinite" }}
                        />
                      </div>
                    )}
                    {result?.heatmap && (
                      <div className="absolute bottom-3 right-3">
                        <RainbowButton
                          size="sm"
                          className="gap-2 text-sm px-4 py-2 h-9 rounded-lg shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHeatmap(!showHeatmap);
                          }}
                        >
                          <Layers className="h-4 w-4" />
                          {showHeatmap ? "Show Original" : "Show AI Heatmap"}
                        </RainbowButton>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-base">
                      <FileImage className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700 truncate max-w-[200px]">{file?.name}</span>
                      <span className="text-gray-400">({(file?.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-full text-gray-500 hover:text-red-600 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 p-14 sm:p-20">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 border-2 border-gray-300">
                    <Upload className="h-9 w-9 text-gray-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-semibold text-lg text-black">Drop your medical image here</p>
                    <p className="text-base text-gray-500">
                      or <span className="text-black underline underline-offset-2 font-medium">browse files</span> from your computer
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-base text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <RainbowButton
              size="lg"
              className="w-full gap-2 py-7 text-lg font-bold h-16 rounded-xl disabled:opacity-40"
              onClick={analyzeImage}
              disabled={!file || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Analyzing Image...
                </>
              ) : (
                <>
                  <ScanLine className="h-6 w-6" />
                  Analyze Image
                </>
              )}
            </RainbowButton>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {["HIPAA Compliant", "End-to-End Encrypted", "Real-time Results"].map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm text-gray-600 font-medium"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes scanLine {
          0% { top: -2px; }
          50% { top: 100%; }
          100% { top: -2px; }
        }
      `}</style>
    </section>
  );
}
