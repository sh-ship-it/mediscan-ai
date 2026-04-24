import { Poppins, Roboto_Slab } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-sreda", // keep the variable name the same so hero-section works
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "MediScan AI — Instant Medical Image Analysis",
  description:
    "Upload medical images and get AI-powered diagnostic insights in seconds. Trusted by healthcare professionals worldwide. HIPAA compliant, end-to-end encrypted.",
  keywords: [
    "medical imaging",
    "AI diagnostics",
    "radiology",
    "healthcare AI",
    "image analysis",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${robotoSlab.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-poppins)]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
