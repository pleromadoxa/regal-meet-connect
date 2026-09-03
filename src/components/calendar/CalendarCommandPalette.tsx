import { useEffect } from 'react';
import { CalendarDays, CalendarPlus, LayoutGrid, Video } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import type { CalendarView } from '@/lib/calendarUtils';

interface CalendarCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewEvent: () => void;
  onScheduleMeet: () => void;
  onGoToday: () => void;
  onChangeView: (view: CalendarView) => void;
}

export const CalendarCommandPalette = ({
  open,
  onOpenChange,
  onNewEvent,
  onScheduleMeet,
  onGoToday,
  onChangeView,
}: CalendarCommandPaletteProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  const run = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Create">
          <CommandItem onSelect={() => run(onScheduleMeet)}>
            <Video className="mr-2 h-4 w-4 text-orange-400" />
            Schedule Regal Meeting
          </CommandItem>
          <CommandItem onSelect={() => run(onNewEvent)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            New calendar event
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => run(onGoToday)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Go to today
          </CommandItem>
          <CommandItem onSelect={() => run(() => onChangeView('day'))}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Day view
          </CommandItem>
          <CommandItem onSelect={() => run(() => onChangeView('week'))}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Week view
          </CommandItem>
          <CommandItem onSelect={() => run(() => onChangeView('month'))}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Month view
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
