"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

export function Globe({ className = "" }) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const [rotation, setRotation] = useState(0);
  const phiRef = useRef(0);

  useEffect(() => {
    let width = 0;
    let currentPhi = 0;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 3,
      mapSamples: 36000,
      mapBrightness: 2.5,
      baseColor: [0.4, 0.35, 0.3],
      markerColor: [0.7, 0.55, 0.4],
      glowColor: [0.25, 0.22, 0.2],
      markers: [
        { location: [37.7749, -122.4194], size: 0.06 }, // San Francisco
        { location: [40.7128, -74.006], size: 0.06 },   // New York
        { location: [51.5074, -0.1278], size: 0.06 },   // London
        { location: [35.6762, 139.6503], size: 0.06 },  // Tokyo
        { location: [28.6139, 77.209], size: 0.06 },    // Delhi
        { location: [-33.8688, 151.2093], size: 0.06 }, // Sydney
        { location: [1.3521, 103.8198], size: 0.06 },   // Singapore
        { location: [48.8566, 2.3522], size: 0.06 },    // Paris
        { location: [-23.5505, -46.6333], size: 0.06 }, // São Paulo
        { location: [55.7558, 37.6173], size: 0.06 },   // Moscow
      ],
      onRender: (state) => {
        if (!pointerInteracting.current) {
          currentPhi += 0.003;
        }
        state.phi = currentPhi + rotation;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    }, 100);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [rotation]);

  return (
    <div
      className={`relative aspect-square w-full max-w-[600px] mx-auto ${className}`}
    >
      {/* Glow backdrop */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[oklch(0.5_0.08_180/15%)] to-transparent blur-3xl scale-110 animate-pulse-slow" />

      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current =
            e.clientX - pointerInteractionMovement.current;
          canvasRef.current.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          canvasRef.current.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          canvasRef.current.style.cursor = "grab";
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            setRotation(delta / 200);
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            setRotation(delta / 100);
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          contain: "layout paint size",
          opacity: 0,
          transition: "opacity 1s ease",
        }}
        className={className}
      />
    </div>
  );
}

export default Globe;
