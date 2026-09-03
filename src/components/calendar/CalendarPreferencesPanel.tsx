import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import { useToast } from '@/hooks/use-toast';
import { userTimezone } from '@/lib/calendarUtils';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Africa/Accra',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
];

export const CalendarPreferencesPanel = () => {
  const { prefs, loading, savePrefs } = useCalendarPreferences();
  const { toast } = useToast();
  const [timezone, setTimezone] = useState(userTimezone());
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [reminder, setReminder] = useState('15');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefs) {
      setTimezone(prefs.timezone);
      setWorkStart(prefs.work_start.slice(0, 5));
      setWorkEnd(prefs.work_end.slice(0, 5));
      setReminder(String(prefs.default_reminder_minutes));
    }
  }, [prefs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePrefs({
        timezone,
        work_start: workStart,
        work_end: workEnd,
        default_reminder_minutes: parseInt(reminder, 10),
        work_days: prefs?.work_days ?? [1, 2, 3, 4, 5],
      });
      toast({ title: 'Preferences saved' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Work day starts</Label>
          <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="border-white/10 bg-black/30 text-white" />
        </div>
        <div className="space-y-2">
          <Label>Work day ends</Label>
          <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="border-white/10 bg-black/30 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Default reminder (minutes before)</Label>
        <Select value={reminder} onValueChange={setReminder}>
          <SelectTrigger className="border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">None</SelectItem>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="premium" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" />Save preferences</>}
      </Button>
    </div>
  );
};
