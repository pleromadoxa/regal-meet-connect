/** Ambient background — gradient orbs, grid, vignette */
export const LandingBackground = () => (
  <div className="landing-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
    <div className="landing-aurora landing-aurora-a" />
    <div className="landing-aurora landing-aurora-b" />
    <div className="landing-aurora landing-aurora-c" />
    <div className="landing-grid absolute inset-0 opacity-[0.35]" />
    <div className="absolute inset-0 bg-gradient-to-b from-[#0a0612]/20 via-transparent to-[#0a0612]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0612_72%)]" />
  </div>
);
