import { format } from 'date-fns';
import { Calendar, Link2, Repeat, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalendarAdminStats } from '@/hooks/useAdmin';

interface CalendarAnalyticsSectionProps {
  stats: CalendarAdminStats | null;
  loading: boolean;
}

export const CalendarAnalyticsSection = ({ stats, loading }: CalendarAnalyticsSectionProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/60">
        Loading calendar analytics…
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="py-12 text-center text-white/50">
          Calendar analytics unavailable. Ensure enterprise calendar migrations are applied.
        </CardContent>
      </Card>
    );
  }

  const teamCalendars = stats.team_calendars ?? [];
  const schedulingLinks = stats.scheduling_links ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-100 flex items-center gap-2">
              <Users className="h-4 w-4" /> Team calendars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total_team_calendars}</div>
            <p className="text-xs text-orange-200">{stats.total_team_members} members total</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-100 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Calendar events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total_calendar_events}</div>
            <p className="text-xs text-orange-200">{stats.team_calendar_events} on team calendars</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-100 flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Scheduling links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.active_scheduling_links}</div>
            <p className="text-xs text-orange-200">{stats.total_scheduling_links} created · {stats.public_bookings_30d} bookings (30d)</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-100 flex items-center gap-2">
              <Repeat className="h-4 w-4" /> Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.reminders_sent_30d}</div>
            <p className="text-xs text-orange-200">{stats.events_this_week} events this week</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Team calendar usage</CardTitle>
        </CardHeader>
        <CardContent>
          {teamCalendars.length === 0 ? (
            <p className="text-sm text-white/50">No team calendars yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-orange-200">Name</TableHead>
                  <TableHead className="text-orange-200">Owner</TableHead>
                  <TableHead className="text-orange-200">Members</TableHead>
                  <TableHead className="text-orange-200">Events</TableHead>
                  <TableHead className="text-orange-200">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamCalendars.map((tc) => (
                  <TableRow key={tc.id} className="border-white/10">
                    <TableCell className="text-white font-medium">{tc.name}</TableCell>
                    <TableCell className="text-white/70">{tc.owner_name || tc.owner_email}</TableCell>
                    <TableCell><Badge className="bg-orange-500/30 text-orange-100">{tc.member_count}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="border-orange-400/40 text-orange-200">{tc.event_count}</Badge></TableCell>
                    <TableCell className="text-white/50 text-sm">{format(new Date(tc.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Scheduling links</CardTitle>
        </CardHeader>
        <CardContent>
          {schedulingLinks.length === 0 ? (
            <p className="text-sm text-white/50">No scheduling links created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-orange-200">Title</TableHead>
                  <TableHead className="text-orange-200">Owner</TableHead>
                  <TableHead className="text-orange-200">Duration</TableHead>
                  <TableHead className="text-orange-200">Status</TableHead>
                  <TableHead className="text-orange-200">Meeting</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulingLinks.map((link) => (
                  <TableRow key={link.id} className="border-white/10">
                    <TableCell className="text-white">{link.title}</TableCell>
                    <TableCell className="text-white/70 text-sm">{link.owner_email}</TableCell>
                    <TableCell className="text-white/70">{link.duration_minutes} min</TableCell>
                    <TableCell>
                      <Badge className={link.is_active ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white/50'}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/50 text-sm">{link.create_meeting ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
