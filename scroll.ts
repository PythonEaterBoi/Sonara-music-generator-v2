/* singleton lenis instance for buttery smooth scrolling */
import Lenis from "lenis";

let lenis: Lenis | null = null;

export function initScroll(): () => void {
  if (lenis) return () => {};
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.02 });
  let raf = 0;
  const loop = (time: number) => {
    lenis?.raf(time);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollToId(id: string) {
  const el = document.querySelector(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -70, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
}
