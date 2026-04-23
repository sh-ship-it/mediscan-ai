"use client";

import { Sparkles, ArrowRight, Shield, Zap, Globe as GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Globe from "@/components/magic/globe";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-b from-[oklch(0.5_0.08_180/8%)] to-transparent blur-3xl" />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.95 0.005 75 / 20%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.95 0.005 75 / 20%) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left side - Text content */}
          <div className="space-y-8 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-chart-1" />
              <span className="text-muted-foreground">
                AI-Powered Diagnostics
              </span>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
                Instant{" "}
                <br className="hidden sm:block" />
                Medical{" "}
                <span className="text-gradient">Insight</span>
              </h1>
              <p className="max-w-lg text-lg sm:text-xl text-muted-foreground leading-relaxed mx-auto lg:mx-0">
                Upload medical images and get AI-powered analysis in seconds.
                Trusted by healthcare professionals worldwide.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button
                size="lg"
                className="gap-2 text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 group"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base px-8 py-6 border-border/60 hover:border-primary/40 transition-all duration-300"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              {[
                {
                  icon: Shield,
                  value: "99.2%",
                  label: "Accuracy",
                },
                {
                  icon: Zap,
                  value: "<3s",
                  label: "Analysis",
                },
                {
                  icon: GlobeIcon,
                  value: "50K+",
                  label: "Scans",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group flex flex-col items-center lg:items-start gap-1"
                >
                  <div className="flex items-center gap-2">
                    <stat.icon className="h-4 w-4 text-chart-1 transition-colors group-hover:text-primary" />
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Globe */}
          <div className="relative flex items-center justify-center">
            <Globe className="w-full max-w-[520px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
