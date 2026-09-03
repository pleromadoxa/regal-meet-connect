/** Ambient background — gradient orbs, grid, vignette */
export const LandingBackground = () => (
  <div className="landing-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
    <div className="landing-aurora landing-aurora-a" />
    <div className="landing-aurora landing-aurora-b" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,53,0.08)_0%,transparent_55%)]" />
    <div className="landing-grid absolute inset-0 opacity-[0.2]" />
    <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/30 via-transparent to-[#0a0a0a]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0a_75%)]" />
  </div>
);
