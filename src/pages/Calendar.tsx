import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  subMonths,
  subWeeks,
} from 'date-fns';
import { Building2, Download, Search, Video, PanelLeft, Clock, CalendarDays, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import { useTeamCalendars } from '@/hooks/useTeamCalendars';
import { useLiveMeetings } from '@/hooks/useLiveMeetings';
import { useTeamLivePresence } from '@/hooks/useTeamLivePresence';
import { useCalendarRealtime } from '@/hooks/useCalendarRealtime';
import { useMeetingActions } from '@/hooks/useMeetingActions';
import { buildMeetingLink, generateMeetingCode } from '@/lib/meeting';
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
import { RegalSlotDialog, type RegalSlotAction } from '@/components/calendar/RegalSlotDialog';
import { RegalBriefSheet } from '@/components/calendar/RegalBriefSheet';
import { QuickJoinDialog } from '@/components/calendar/QuickJoinDialog';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CALENDAR_PRODUCT_NAME } from '@/constants/site';
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
  { icon: Sparkles, title: 'Regal Mesh slots', description: 'Click any open slot to meet instantly, schedule a Regal Meeting, or add a calendar event — one gesture, three paths.' },
  { icon: CalendarDays, title: 'Regal Brief', description: 'Pre-meet intelligence: invitee status, join links, and live meeting pulse — only on Regal Calendar + Meeting.' },
  { icon: Clock, title: 'Smart scheduling', description: 'Conflict detection, email reminders, team calendars, and public booking links with auto-generated meeting rooms.' },
  { icon: Video, title: 'Live Pulse', description: 'See which scheduled meetings are live right now on your calendar grid. Join with one click.' },
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
  const { isLive } = useLiveMeetings(15_000);
  const { liveMeetings, loading: livePresenceLoading } = useTeamLivePresence();
  const { createMeeting } = useMeetingActions();
  const { toast } = useToast();
  const navigate = useNavigate();

  const stableRefetch = useCallback(() => void refetch(), [refetch]);
  useCalendarRealtime(stableRefetch);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week'
  );
  const [filters, setFilters] = useState(DEFAULT_CALENDAR_FILTERS);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [briefEvent, setBriefEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [meetOpen, setMeetOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [slotTimes, setSlotTimes] = useState({ start: '09:00', end: '10:00' });

  const filteredEvents = useMemo(() => filterCalendarEvents(events, filters), [events, filters]);

  const openSlotPicker = (date: Date, start: string, end: string) => {
    setSelectedDate(date);
    setSlotTimes({ start, end });
    setSlotOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    const times = slotFromClick(hour);
    openSlotPicker(date, times.start, times.end);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    if (view === 'month') setView('day');
  };

  const handleAvailabilitySlot = (start: Date, end: Date) => {
    setEnterpriseOpen(false);
    openSlotPicker(start, format(start, 'HH:mm'), format(end, 'HH:mm'));
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.source === 'meeting') setBriefEvent(event);
    else setSelectedEvent(event);
  };

  const handleRegalSlotAction = async (action: RegalSlotAction) => {
    if (action === 'calendar-event') {
      setCreateOpen(true);
      return;
    }
    if (action === 'schedule-meet') {
      setMeetOpen(true);
      return;
    }
    // Meet now
    const meetingId = generateMeetingCode();
    const title = `Quick meet · ${format(new Date(), 'h:mm a')}`;
    const [sh, sm] = slotTimes.start.split(':').map(Number);
    const start = new Date(selectedDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(start.getTime() + 30 * 60_000);

    try {
      await createMeeting(meetingId, title);
      await createEvent({
        title,
        startTime: start,
        endTime: end,
        location: buildMeetingLink(meetingId),
        color: 'orange',
        skipConflictCheck: true,
        reminderMinutes: 0,
      });
      toast({ title: 'Meeting started', description: 'Calendar blocked for 30 minutes.' });
      navigate(`/meeting/${meetingId}`);
    } catch {
      toast({ title: 'Could not start meeting', variant: 'destructive' });
    }
  };

  const handleInstantMeet = async () => {
    const meetingId = generateMeetingCode();
    const title = `Instant meet · ${format(new Date(), 'h:mm a')}`;
    try {
      await createMeeting(meetingId, title);
      toast({ title: 'Starting meeting…' });
      navigate(`/meeting/${meetingId}`);
    } catch {
      toast({ title: 'Could not start meeting', variant: 'destructive' });
    }
  };

  const joinMeeting = (event: CalendarEvent) => {
    if (event.meeting_id) navigate(`/meeting/${event.meeting_id}`);
    else if (event.location) window.open(event.location, '_blank');
  };

  const joinLiveByCode = (code: string) => navigate(`/meeting/${code}`);

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
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
            isLiveMeeting={isLive}
          />
        );
      case 'month':
        return (
          <CalendarMonthView
            currentDate={selectedDate}
            events={filteredEvents}
            onNavigateMonth={(dir) => setSelectedDate((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)))}
            onSelectDate={handleSelectDate}
            onEventClick={handleEventClick}
            isLiveMeeting={isLive}
          />
        );
      default:
        return (
          <CalendarWeekView
            currentDate={selectedDate}
            events={filteredEvents}
            onNavigateWeek={(dir) => setSelectedDate((d) => (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)))}
            onSelectDate={setSelectedDate}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
            isLiveMeeting={isLive}
          />
        );
    }
  };

  return (
    <div className="flex h-screen-safe min-h-0 flex-col overflow-hidden bg-[#0a0a0a] text-white">
      <LandingBackground />

      <RegalAppHeader
        title={CALENDAR_PRODUCT_NAME}
        activeProduct="calendar"
        user={user}
        profile={profile}
        onSignOut={signOut}
        dense
        secondaryRow={<CalendarViewSwitcher view={view} onChange={setView} />}
        headerActions={
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/50 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open calendar sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/50 hover:text-white xl:hidden"
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
              className="hidden shadow-[0_0_16px_rgba(255,107,53,0.25)] sm:inline-flex"
              onClick={() => setMeetOpen(true)}
            >
              <Video className="mr-1.5 h-4 w-4" />
              + Meet
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden border-white/10 bg-white/5 text-white/70 md:inline-flex"
              onClick={() => setCreateOpen(true)}
            >
              New event
            </Button>
          </>
        }
      />

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-3 sm:gap-4 sm:p-6 sm:pb-6 xl:flex-row">
        <CalendarSidebar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          events={filteredEvents}
          filters={filters}
          onFiltersChange={setFilters}
          onEventClick={handleEventClick}
          liveMeetings={liveMeetings}
          livePresenceLoading={livePresenceLoading}
          onJoinLiveMeeting={joinLiveByCode}
          className="hidden min-h-0 lg:flex"
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{renderView()}</div>

        <CalendarRightPanel
          upcomingEvents={upcomingEvents}
          onEventClick={handleEventClick}
          onNewEvent={() => setCreateOpen(true)}
          onScheduleMeet={() => setMeetOpen(true)}
          className="hidden min-h-0 xl:flex"
        />
      </main>

      {/* Mobile FAB row */}
      <div className="fixed bottom-3 right-3 z-30 flex gap-2 safe-area-inset-bottom sm:bottom-4 sm:right-4 lg:hidden">
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/15 bg-[#111]/95 shadow-lg backdrop-blur touch-target" onClick={() => setCreateOpen(true)} aria-label="New event">
          <CalendarDays className="h-5 w-5" />
        </Button>
        <Button variant="premium" size="icon" className="h-12 w-12 rounded-full shadow-[0_0_24px_rgba(255,107,53,0.35)] touch-target" onClick={() => setMeetOpen(true)} aria-label="Start meeting">
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

      <RegalBriefSheet
        event={briefEvent}
        isLive={briefEvent ? isLive(briefEvent.meeting_id) : false}
        onClose={() => setBriefEvent(null)}
        onJoin={joinMeeting}
      />

      <RegalSlotDialog
        open={slotOpen}
        onOpenChange={setSlotOpen}
        slotDate={selectedDate}
        startTime={slotTimes.start}
        endTime={slotTimes.end}
        onAction={handleRegalSlotAction}
      />

      <QuickJoinDialog open={joinOpen} onOpenChange={setJoinOpen} />

      <CalendarCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNewEvent={() => setCreateOpen(true)}
        onScheduleMeet={() => setMeetOpen(true)}
        onInstantMeet={handleInstantMeet}
        onQuickJoin={() => setJoinOpen(true)}
        onGoToday={() => setSelectedDate(new Date())}
        onChangeView={setView}
      />

      <QuickMeetDialog
        selectedDate={selectedDate}
        defaultTime={slotTimes.start}
        open={meetOpen}
        onOpenChange={setMeetOpen}
        onScheduled={() => void refetch()}
      />
      <CreateEventDialog
        selectedDate={selectedDate}
        onCreate={createEvent}
        onScheduled={() => void refetch()}
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
        liveMeetings={liveMeetings}
        livePresenceLoading={livePresenceLoading}
        onJoinLiveMeeting={joinLiveByCode}
      />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[min(92dvh,42rem)] max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-2xl border-white/10 bg-[#0a0a0a] p-0 text-white"
        >
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 py-3 pr-12 text-left">
            <SheetTitle className="text-white">Calendar</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <CalendarSidebar
              embedded
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                handleSelectDate(date);
                setSidebarOpen(false);
              }}
              events={filteredEvents}
              filters={filters}
              onFiltersChange={setFilters}
              onEventClick={(event) => {
                handleEventClick(event);
                setSidebarOpen(false);
              }}
              liveMeetings={liveMeetings}
              livePresenceLoading={livePresenceLoading}
              onJoinLiveMeeting={joinLiveByCode}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={upcomingOpen} onOpenChange={setUpcomingOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[min(92dvh,42rem)] max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-2xl border-white/10 bg-[#0a0a0a] p-0 text-white"
        >
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 py-3 pr-12 text-left">
            <SheetTitle className="text-white">Upcoming</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <CalendarRightPanel
              embedded
              upcomingEvents={upcomingEvents}
              onEventClick={(event) => {
                handleEventClick(event);
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
