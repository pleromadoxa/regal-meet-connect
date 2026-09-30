import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM'];

const EVENTS = [
  { day: 0, start: 0, span: 1, title: 'Design review', color: 'bg-blue-500/25 border-blue-500/40 text-blue-200' },
  { day: 1, start: 1, span: 2, title: 'Sprint planning', color: 'bg-orange-500/25 border-orange-500/40 text-orange-200' },
  { day: 2, start: 2, span: 1, title: '1:1 with Alex', color: 'bg-purple-500/25 border-purple-500/40 text-purple-200' },
  { day: 3, start: 3, span: 1, title: 'Team lunch', color: 'bg-emerald-500/20 border-emerald-500/35 text-emerald-200' },
  { day: 4, start: 1, span: 1, title: 'Regal Meeting', color: 'bg-orange-500/30 border-orange-500/50 text-orange-100' },
];

const ROW_HEIGHT = 48;

/** Dark calendar UI mock — Rise / Cron style */
export const CalendarAppPreview = () => (
  <div
    className="landing-app-preview landing-app-preview--calendar landing-fade-up"
    style={{ animationDelay: '0.35s' }}
  >
    <div className="landing-app-window landing-app-window--calendar">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="text-white/30 hover:text-white/60">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-white/70">September 2026</span>
          <button type="button" className="text-white/30 hover:text-white/60">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(255,107,53,0.35)]"
        >
          <Plus className="h-3 w-3" />
          Meet
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 border-r border-white/[0.06] p-4 sm:block lg:w-48">
          <div className="mb-3 grid grid-cols-7 gap-0.5 text-center text-[10px] text-white/30">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <span
                key={d}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  d === 3 ? 'bg-orange-500 font-bold text-white' : 'text-white/50'
                }`}
              >
                {d}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            {['Work', 'Personal', 'Team'].map((cal, i) => (
              <div key={cal} className="flex items-center gap-1.5 text-xs text-white/50">
                <span
                  className={`h-2 w-2 rounded-sm ${
                    i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                />
                {cal}
              </div>
            ))}
          </div>
        </div>

        {/* Week grid */}
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-5 border-b border-white/[0.06]">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className={`border-r border-white/[0.06] px-2 py-2 text-center last:border-r-0 ${
                  i === 2 ? 'bg-orange-500/[0.06]' : ''
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">{day}</p>
                <p
                  className={`text-base font-bold ${
                    i === 2 ? 'mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white' : 'text-white/70'
                  }`}
                >
                  {i + 1}
                </p>
              </div>
            ))}
          </div>

          <div className="relative grid grid-cols-[48px_1fr]">
            <div className="border-r border-white/[0.06]">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-b border-white/[0.04] px-1.5 pt-1.5 text-[10px] text-white/25"
                  style={{ height: ROW_HEIGHT }}
                >
                  {h}
                </div>
              ))}
            </div>
            <div className="relative grid grid-cols-5">
              {DAYS.map((day) => (
                <div key={day} className="border-r border-white/[0.04] last:border-r-0">
                  {HOURS.map((h) => (
                    <div key={h} className="border-b border-white/[0.04]" style={{ height: ROW_HEIGHT }} />
                  ))}
                </div>
              ))}
              {EVENTS.map((ev) => (
                <div
                  key={ev.title}
                  className={`absolute rounded border px-1.5 py-1 text-[10px] font-medium leading-tight ${ev.color}`}
                  style={{
                    left: `calc(${(ev.day / 5) * 100}% + 2px)`,
                    width: `calc(${100 / 5}% - 4px)`,
                    top: `${ev.start * ROW_HEIGHT + 2}px`,
                    height: `${ev.span * ROW_HEIGHT - 4}px`,
                  }}
                >
                  {ev.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Command palette hint */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <div className="mx-auto flex max-w-sm items-center gap-2 rounded-lg border border-white/[0.08] bg-[#111111] px-3.5 py-2">
          <Search className="h-3.5 w-3.5 text-white/25" />
          <span className="text-xs text-white/30">
            Type <span className="text-orange-400/80">meet</span> to schedule…
          </span>
        </div>
      </div>
    </div>
  </div>
);
