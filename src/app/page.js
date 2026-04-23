import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import UploadSection from "@/components/upload-section";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <UploadSection />
      </main>
      <Footer />
    </>
  );
}
