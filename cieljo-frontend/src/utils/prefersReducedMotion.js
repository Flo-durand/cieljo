// True when the user asked their system to reduce motion: the animations are then skipped
export default function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
