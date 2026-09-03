import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  subMonths,
  subWeeks,
} from 'date-fns';
import { Building2, Download, Search, Video, PanelLeft, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import { useTeamCalendars } from '@/hooks/useTeamCalendars';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { CalendarLandingHero } from '@/components/landing/CalendarLandingHero';
import { Footer } from '@/components/Footer';
import { RegalAppHeader } from '@/components/layout/RegalAppHeader';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView';
import { CalendarDayView } from '@/components/calendar/CalendarDayView';
import { CalendarMonthView } from '@/components/calendar/CalendarMonthView';
import { CalendarViewSwitcher } from '@/components/calendar/CalendarViewSwitcher';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { QuickMeetDialog } from '@/components/calendar/QuickMeetDialog';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';
import { CalendarRightPanel } from '@/components/calendar/CalendarRightPanel';
import { CalendarCommandPalette } from '@/components/calendar/CalendarCommandPalette';
import { EnterpriseCalendarSheet } from '@/components/calendar/EnterpriseCalendarSheet';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CALENDAR_PRODUCT_NAME } from '@/constants/site';
import {
  CalendarDays,
  Clock,
  Link2,
  Users,
} from 'lucide-react';
import {
  DEFAULT_CALENDAR_FILTERS,
  filterCalendarEvents,
  slotFromClick,
  type CalendarView,
} from '@/lib/calendarUtils';
import { downloadIcs } from '@/lib/calendarIcs';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const CALENDAR_FEATURES = [
  { icon: CalendarDays, title: 'Shared team calendars', description: 'Create calendars for your team and see everyone\'s availability at a glance.' },
  { icon: Clock, title: 'Smart scheduling', description: 'Find the best time for meetings with conflict detection and time zone support.' },
  { icon: Link2, title: 'Regal Meeting sync', description: 'Scheduled meetings appear automatically — one click to join from your calendar.' },
  { icon: Users, title: 'Invite collaborators', description: 'Add teammates by email. Everyone sees the same events with one Regal account.' },
];

const CalendarLandingContent = ({
  user,
  signOut,
}: {
  user: { email?: string | null } | null;
  signOut: () => void;
}) => (
  <>
    <LandingHeader user={user} onSignOut={signOut} activeProduct="calendar" />
    <main>
      <CalendarLandingHero user={user} />
      <section className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400/90">Built for teams</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Schedule smarter.
            <span className="landing-text-gradient"> Meet faster.</span>
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CALENDAR_FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="mb-4 inline-flex rounded-xl border border-white/10 bg-orange-500/10 p-3 text-orange-400">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
    <Footer className="border-white/10 bg-transparent" isAuthenticated={Boolean(user)} />
  </>
);

const CalendarApp = () => {
  const { user, profile, signOut } = useAuth();
  const { events, upcomingEvents, loading, createEvent, updateEvent, deleteEvent, refetch } = useCalendarEvents();
  const { prefs, workHours } = useCalendarPreferences();
  const { calendars: teamCalendars } = useTeamCalendars();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week'
  );
  const [filters, setFilters] = useState(DEFAULT_CALENDAR_FILTERS);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [meetOpen, setMeetOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [slotTimes, setSlotTimes] = useState({ start: '09:00', end: '10:00' });

  const filteredEvents = useMemo(() => filterCalendarEvents(events, filters), [events, filters]);

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    const times = slotFromClick(hour);
    setSlotTimes(times);
    setCreateOpen(true);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    if (view === 'month') setView('day');
  };

  const handleAvailabilitySlot = (start: Date, end: Date) => {
    setSelectedDate(start);
    setSlotTimes({
      start: format(start, 'HH:mm'),
      end: format(end, 'HH:mm'),
    });
    setEnterpriseOpen(false);
    setCreateOpen(true);
  };

  const joinMeeting = (event: CalendarEvent) => {
    if (event.meeting_id) navigate(`/meeting/${event.meeting_id}`);
    else if (event.location) window.open(event.location, '_blank');
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0d0d0d]/80">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-400" />
        </div>
      );
    }

    switch (view) {
      case 'day':
        return (
          <CalendarDayView
            currentDate={selectedDate}
            events={filteredEvents}
            onNavigateDay={(dir) => setSelectedDate((d) => addDays(d, dir))}
            onSelectDate={setSelectedDate}
            onEventClick={setSelectedEvent}
            onSlotClick={handleSlotClick}
          />
        );
      case 'month':
        return (
          <CalendarMonthView
            currentDate={selectedDate}
            events={filteredEvents}
            onNavigateMonth={(dir) => setSelectedDate((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)))}
            onSelectDate={handleSelectDate}
            onEventClick={setSelectedEvent}
          />
        );
      default:
        return (
          <CalendarWeekView
            currentDate={selectedDate}
            events={filteredEvents}
            onNavigateWeek={(dir) => setSelectedDate((d) => (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)))}
            onSelectDate={setSelectedDate}
            onEventClick={setSelectedEvent}
            onSlotClick={handleSlotClick}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen-safe flex-col bg-[#0a0a0a] text-white">
      <LandingBackground />

      <RegalAppHeader
        title={CALENDAR_PRODUCT_NAME}
        activeProduct="calendar"
        user={user}
        profile={profile}
        onSignOut={signOut}
        secondaryRow={<CalendarViewSwitcher view={view} onChange={setView} />}
        headerActions={
          <>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open calendar sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white xl:hidden"
              onClick={() => setUpcomingOpen(true)}
              aria-label="Upcoming events"
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-white/50 hover:text-white md:inline-flex"
              onClick={() => setEnterpriseOpen(true)}
            >
              <Building2 className="mr-1.5 h-4 w-4" />
              Enterprise
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden text-white/50 hover:text-white sm:inline-flex"
              onClick={() => downloadIcs(events)}
              title="Export ICS"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-white/50 hover:text-white md:inline-flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="mr-1.5 h-4 w-4" />
              <span className="text-xs">⌘K</span>
            </Button>
            <Button
              variant="premium"
              size="sm"
              className="shadow-[0_0_16px_rgba(255,107,53,0.25)]"
              onClick={() => setMeetOpen(true)}
            >
              <Video className="mr-1.5 h-4 w-4" />
              + Meet
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden border-white/10 bg-white/5 text-white/70 sm:inline-flex"
              onClick={() => setCreateOpen(true)}
            >
              New event
            </Button>
          </>
        }
      />

      <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 sm:p-6 xl:flex-row">
        <CalendarSidebar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          events={filteredEvents}
          filters={filters}
          onFiltersChange={setFilters}
          onEventClick={setSelectedEvent}
          className="hidden lg:flex"
        />

        <div className="flex min-h-[360px] min-w-0 flex-1 flex-col sm:min-h-[480px]">{renderView()}</div>

        <CalendarRightPanel
          upcomingEvents={upcomingEvents}
          onEventClick={setSelectedEvent}
          onNewEvent={() => setCreateOpen(true)}
          onScheduleMeet={() => setMeetOpen(true)}
          className="hidden xl:flex"
        />
      </main>

      {/* Mobile FAB row */}
      <div className="fixed bottom-4 right-4 z-30 flex gap-2 safe-area-inset-bottom lg:hidden">
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-full border-white/15 bg-[#111]/90 backdrop-blur" onClick={() => setCreateOpen(true)}>
          <CalendarDays className="h-5 w-5" />
        </Button>
        <Button variant="premium" size="icon" className="h-11 w-11 rounded-full shadow-[0_0_24px_rgba(255,107,53,0.35)]" onClick={() => setMeetOpen(true)}>
          <Video className="h-5 w-5" />
        </Button>
      </div>

      <EventDetailDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
        onJoinMeeting={joinMeeting}
      />

      <CalendarCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNewEvent={() => setCreateOpen(true)}
        onScheduleMeet={() => setMeetOpen(true)}
        onGoToday={() => setSelectedDate(new Date())}
        onChangeView={setView}
      />

      <QuickMeetDialog selectedDate={selectedDate} open={meetOpen} onOpenChange={setMeetOpen} onScheduled={() => void refetch()} />
      <CreateEventDialog
        selectedDate={selectedDate}
        onCreate={createEvent}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStartTime={slotTimes.start}
        defaultEndTime={slotTimes.end}
        hideTrigger
        teamCalendars={teamCalendars}
        defaultReminderMinutes={prefs?.default_reminder_minutes ?? 15}
      />

      <EnterpriseCalendarSheet
        open={enterpriseOpen}
        onOpenChange={setEnterpriseOpen}
        events={events}
        workHours={workHours}
        selectedDate={selectedDate}
        onSelectSlot={handleAvailabilitySlot}
      />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-full border-white/10 bg-[#0a0a0a] p-0 text-white sm:max-w-sm">
          <SheetHeader className="border-b border-white/10 px-4 py-4">
            <SheetTitle className="text-left text-white">Calendar</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <CalendarSidebar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                handleSelectDate(date);
                setSidebarOpen(false);
              }}
              events={filteredEvents}
              filters={filters}
              onFiltersChange={setFilters}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setSidebarOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={upcomingOpen} onOpenChange={setUpcomingOpen}>
        <SheetContent side="right" className="w-full border-white/10 bg-[#0a0a0a] p-0 text-white sm:max-w-sm">
          <SheetHeader className="border-b border-white/10 px-4 py-4">
            <SheetTitle className="text-left text-white">Upcoming</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <CalendarRightPanel
              upcomingEvents={upcomingEvents}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setUpcomingOpen(false);
              }}
              onNewEvent={() => {
                setUpcomingOpen(false);
                setCreateOpen(true);
              }}
              onScheduleMeet={() => {
                setUpcomingOpen(false);
                setMeetOpen(true);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Footer className="relative z-10 border-white/10 bg-transparent" isAuthenticated />
    </div>
  );
};

const Calendar = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  useDocumentTitle(CALENDAR_PRODUCT_NAME);

  if (authLoading) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-[#0a0a0a]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen-safe overflow-x-clip bg-[#0a0a0a] text-white">
        <LandingBackground />
        <CalendarLandingContent user={user} onSignOut={signOut} />
      </div>
    );
  }

  return <CalendarApp />;
};

export default Calendar;
