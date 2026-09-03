import { useState } from 'react';
import { Building2, Clock, Link2, Settings2, Users } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamCalendarsPanel } from '@/components/calendar/TeamCalendarsPanel';
import { SchedulingLinksPanel } from '@/components/calendar/SchedulingLinksPanel';
import { CalendarPreferencesPanel } from '@/components/calendar/CalendarPreferencesPanel';
import { AvailabilityPanel } from '@/components/calendar/AvailabilityPanel';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';
import type { WorkHours } from '@/lib/calendarAvailability';

interface EnterpriseCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: CalendarEvent[];
  workHours: WorkHours;
  selectedDate: Date;
  onSelectSlot: (start: Date, end: Date) => void;
}

export const EnterpriseCalendarSheet = ({
  open,
  onOpenChange,
  events,
  workHours,
  selectedDate,
  onSelectSlot,
}: EnterpriseCalendarSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#0d0d0d] text-white sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-white">
          <Building2 className="h-5 w-5 text-orange-400" />
          Enterprise Calendar
        </SheetTitle>
        <p className="text-sm text-white/45">Team calendars, scheduling links, and availability.</p>
      </SheetHeader>

      <Tabs defaultValue="availability" className="mt-6">
        <TabsList className="grid w-full grid-cols-4 bg-white/5">
          <TabsTrigger value="availability" className="text-xs"><Clock className="mr-1 h-3 w-3" />Slots</TabsTrigger>
          <TabsTrigger value="team" className="text-xs"><Users className="mr-1 h-3 w-3" />Team</TabsTrigger>
          <TabsTrigger value="links" className="text-xs"><Link2 className="mr-1 h-3 w-3" />Links</TabsTrigger>
          <TabsTrigger value="prefs" className="text-xs"><Settings2 className="mr-1 h-3 w-3" />Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="mt-4">
          <AvailabilityPanel
            date={selectedDate}
            events={events}
            workHours={workHours}
            onSelectSlot={onSelectSlot}
          />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <TeamCalendarsPanel />
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <SchedulingLinksPanel />
        </TabsContent>
        <TabsContent value="prefs" className="mt-4">
          <CalendarPreferencesPanel />
        </TabsContent>
      </Tabs>
    </SheetContent>
  </Sheet>
);
