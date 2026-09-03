import { useState } from 'react';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeamCalendars } from '@/hooks/useTeamCalendars';
import { cn } from '@/lib/utils';

export const TeamCalendarsPanel = () => {
  const { calendars, members, loading, createCalendar, addMember, removeMember, fetchMembers } = useTeamCalendars();
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const cal = await createCalendar(name.trim());
      setSelectedId(cal.id);
      setName('');
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedId || !memberEmail.trim()) return;
    setAdding(true);
    try {
      await addMember(selectedId, memberEmail.trim());
      setMemberEmail('');
      await fetchMembers(selectedId);
    } finally {
      setAdding(false);
    }
  };

  const selectCalendar = async (id: string) => {
    setSelectedId(id);
    await fetchMembers(id);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-white/70">Create team calendar</Label>
        <div className="mt-2 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Engineering, Sales…"
            className="border-white/10 bg-black/30 text-white"
          />
          <Button variant="premium" size="sm" onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {calendars.length > 0 && (
        <div>
          <Label className="text-white/70">Your team calendars</Label>
          <ul className="mt-2 space-y-1">
            {calendars.map((cal) => (
              <li key={cal.id}>
                <button
                  type="button"
                  onClick={() => selectCalendar(cal.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selectedId === cal.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-sm', cal.color === 'purple' ? 'bg-purple-500' : 'bg-orange-500')} />
                  {cal.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedId && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/35">Members</p>
          <ul className="mb-3 space-y-1">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-xs text-white/60">
                <span>{m.email} <span className="text-white/30">({m.role})</span></span>
                {m.role !== 'owner' && (
                  <button type="button" onClick={() => removeMember(m.id)} className="text-red-400/70 hover:text-red-400">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="h-8 border-white/10 bg-black/30 text-xs text-white"
            />
            <Button size="sm" variant="outline" className="h-8 border-white/10" onClick={handleAddMember} disabled={adding}>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
