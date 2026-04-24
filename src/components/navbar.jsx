"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== "undefined") {
        // Hide if scrolling down, show if scrolling up
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  return (
    <nav
      className={cn(
        "fixed top-6 left-0 right-0 z-50 flex justify-center transition-all duration-500",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
      )}
    >
      <div className="flex items-center gap-48 px-20 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* Brand Link */}
        <Link 
          href="/" 
          className="text-gray-700 font-bold text-xl tracking-tight hover:opacity-70 transition-all"
        >
          MediScan <span className="text-blue-400">AI</span>
        </Link>
        
        {/* Navigation Link */}
        <Link 
          href="/dashboard" 
          className="text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 px-4 py-1.5 rounded-full transition-all"
        >
          Dashboard
        </Link>
      </div>
    </nav>
  );
}