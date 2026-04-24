"use client";

import { Sparkles } from "lucide-react";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { cn } from "@/lib/utils";

export default function HeroSection() {
  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-white">
      <InteractiveGridPattern
        className={cn(
          "absolute inset-0 h-full w-full",
          "[mask-image:radial-gradient(ellipse_at_center,white_40%,transparent_100%)]"
        )}
        width={40}
        height={40}
        squares={[80, 80]}
        squaresClassName="hover:fill-blue-500"
      />
      
      <div className="z-10 flex flex-col items-center text-center space-y-8 px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 px-5 py-2 text-base backdrop-blur-sm">
          <Sparkles className="h-4 w-4 text-black" />
          <span className="text-gray-800 font-medium">
            AI-Powered Diagnostics
          </span>
        </div>
        
        <h1 className="text-7xl sm:text-8xl lg:text-9xl font-extrabold tracking-tighter text-black font-[family-name:var(--font-sreda)]">
          MediScan AI
        </h1>
        
        <p className="max-w-[650px] text-xl sm:text-2xl text-gray-600">
          See Beyond the Scan.
          Advanced AI analysis with reports, heatmaps, and history tracking
        </p>
        
        <div className="pt-6">
          <a href="#upload">
            <RainbowButton size="lg" className="text-lg px-12 py-6 h-14 rounded-xl">
              Get Started
            </RainbowButton>
          </a>
        </div>
      </div>
    </section>
  );
}
