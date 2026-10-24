import { useEffect } from "react";
import { PlayerProvider, usePlayer } from "@/hooks/usePlayer";
import { initScroll } from "@/lib/scroll";
import Backdrop from "@/components/Backdrop";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Studio from "@/components/Studio";
import Library from "@/components/Library";
import Footer from "@/components/Footer";

function SpacebarToggle() {
  const { toggle, status } = usePlayer();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement;
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable
      )
        return;
      e.preventDefault();
      if (status === "ready") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, status]);
  return null;
}

function Site() {
  useEffect(() => initScroll(), []);
  return (
    <div className="grain relative min-h-screen bg-bg text-ink">
      <Backdrop />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Studio />
        <Library />
      </main>
      <Footer />
      <SpacebarToggle />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <Site />
    </PlayerProvider>
  );
}
