import { useState } from 'react';
import { Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSchedulingLinks } from '@/hooks/useSchedulingLinks';
import { useToast } from '@/hooks/use-toast';

export const SchedulingLinksPanel = () => {
  const { links, loading, createLink, toggleLink, deleteLink, bookingUrl } = useSchedulingLinks();
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createLink(title.trim());
      setTitle('');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(bookingUrl(slug));
    toast({ title: 'Link copied', description: 'Share with anyone to book time with you.' });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-white/55">
          Create shareable booking pages — like Calendly, but built into Regal Calendar.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="30-min intro call"
            className="border-white/10 bg-black/30 text-white"
          />
          <Button variant="premium" size="sm" onClick={handleCreate} disabled={creating || !title.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-white/35">No scheduling links yet.</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white/85">{link.title}</p>
                  <p className="text-[10px] text-white/40">{link.duration_minutes} min · /calendar/book/{link.slug}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={link.is_active} onCheckedChange={(v) => toggleLink(link.id, v)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/70" onClick={() => deleteLink(link.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full border-white/10 text-xs text-white/70" onClick={() => copyLink(link.slug)}>
                <Copy className="mr-1.5 h-3 w-3" />
                Copy booking link
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
