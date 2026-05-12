import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, User, Bell, Mic, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AvatarUpload } from '@/components/AvatarUpload';
import logo from '@/assets/regal-logo.png';

interface UserSettings {
  display_name: string;
  bio: string;
  avatar_url: string;
  email_notifications: boolean;
  push_notifications: boolean;
  meeting_reminders: boolean;
  sound_enabled: boolean;
  camera_default_on: boolean;
  microphone_default_on: boolean;
  default_audio_device: string;
  default_video_device: string;
  theme: string;
  language: string;
}

const DEFAULTS: UserSettings = {
  display_name: '',
  bio: '',
  avatar_url: '',
  email_notifications: true,
  push_notifications: true,
  meeting_reminders: true,
  sound_enabled: true,
  camera_default_on: true,
  microphone_default_on: false,
  default_audio_device: '',
  default_video_device: '',
  theme: 'system',
  language: 'en',
};

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // Load profile + user_settings
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [profileRes, settingsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;

        const next = { ...DEFAULTS };
        if (profileRes.data) {
          next.display_name = profileRes.data.display_name || '';
          next.avatar_url = profileRes.data.avatar_url || '';
          next.bio = (profileRes.data as any).bio || '';
        }
        if (settingsRes.data) {
          const s: any = settingsRes.data;
          next.email_notifications = s.email_notifications ?? true;
          next.push_notifications = s.push_notifications ?? true;
          next.meeting_reminders = s.meeting_reminders ?? true;
          next.sound_enabled = s.sound_enabled ?? true;
          next.camera_default_on = s.camera_default_on ?? true;
          next.microphone_default_on = s.microphone_default_on ?? false;
          next.theme = s.theme || 'system';
          next.language = s.language || 'en';
        }
        // Local-only device prefs
        const local = localStorage.getItem(`device_prefs_${user.id}`);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            next.default_audio_device = parsed.default_audio_device || '';
            next.default_video_device = parsed.default_video_device || '';
          } catch {}
        }
        setSettings(next);
      } catch (err) {
        console.error('Load settings error:', err);
        toast({ title: 'Could not load settings', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, toast]);

  // Enumerate devices
  useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      } catch (err) {
        console.warn('Device enumeration unavailable', err);
      }
    })();
  }, []);

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Profile
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: settings.display_name,
        avatar_url: settings.avatar_url || null,
        bio: settings.bio || null,
      });
      if (profErr) throw profErr;

      // user_settings (server-side)
      const { error: setErr } = await supabase.from('user_settings').upsert(
        {
          user_id: user.id,
          email_notifications: settings.email_notifications,
          push_notifications: settings.push_notifications,
          meeting_reminders: settings.meeting_reminders,
          sound_enabled: settings.sound_enabled,
          camera_default_on: settings.camera_default_on,
          microphone_default_on: settings.microphone_default_on,
          theme: settings.theme,
          language: settings.language,
        },
        { onConflict: 'user_id' }
      );
      if (setErr) throw setErr;

      // Device prefs (local)
      localStorage.setItem(
        `device_prefs_${user.id}`,
        JSON.stringify({
          default_audio_device: settings.default_audio_device,
          default_video_device: settings.default_video_device,
        })
      );

      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0612] via-[#0d0818] to-[#160a26] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0612] via-[#0d0818] to-[#160a26] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="Regal Meeting" className="h-10 w-10" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
              <p className="text-white/60 text-sm">Manage your Regal Meeting preferences</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6 grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
            <TabsTrigger value="profile" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70">
              <User className="h-4 w-4 mr-2" /> Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70">
              <Bell className="h-4 w-4 mr-2" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70">
              <Mic className="h-4 w-4 mr-2" /> Devices
            </TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <AvatarUpload
                  userId={user!.id}
                  avatarUrl={settings.avatar_url}
                  displayName={settings.display_name || user?.email || ''}
                  onUpload={(url) => update('avatar_url', url)}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Display name</label>
                  <Input
                    value={settings.display_name}
                    onChange={(e) => update('display_name', e.target.value)}
                    placeholder="Your name"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Email</label>
                  <Input value={user?.email || ''} disabled className="bg-white/5 border-white/10 text-white/60" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Bio</label>
                  <Textarea
                    value={settings.bio}
                    onChange={(e) => update('bio', e.target.value)}
                    placeholder="Tell others about you"
                    rows={3}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                  />
                </div>
                <div className="pt-2 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => signOut()}
                    className="bg-red-500/10 border-red-400/30 text-red-300 hover:bg-red-500/20"
                  >
                    Sign out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { k: 'email_notifications' as const, l: 'Email notifications', d: 'Meeting invites and reminders by email' },
                  { k: 'push_notifications' as const, l: 'Push notifications', d: 'In-app notifications when meetings start' },
                  { k: 'meeting_reminders' as const, l: 'Meeting reminders', d: '15 minutes before scheduled meetings' },
                  { k: 'sound_enabled' as const, l: 'Sound effects', d: 'Play sounds for join, leave and chat' },
                ].map(({ k, l, d }) => (
                  <div key={k} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{l}</p>
                      <p className="text-xs text-white/50">{d}</p>
                    </div>
                    <Switch checked={settings[k]} onCheckedChange={(v) => update(k, v)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices */}
          <TabsContent value="devices">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Devices & Defaults</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Camera on by default</p>
                    <p className="text-xs text-white/50">Start meetings with your camera enabled</p>
                  </div>
                  <Switch
                    checked={settings.camera_default_on}
                    onCheckedChange={(v) => update('camera_default_on', v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Microphone on by default</p>
                    <p className="text-xs text-white/50">Start meetings unmuted</p>
                  </div>
                  <Switch
                    checked={settings.microphone_default_on}
                    onCheckedChange={(v) => update('microphone_default_on', v)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Default microphone</label>
                  <Select
                    value={settings.default_audio_device || 'default'}
                    onValueChange={(v) => update('default_audio_device', v === 'default' ? '' : v)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="System default" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0d0818] border-white/10 text-white">
                      <SelectItem value="default">System default</SelectItem>
                      {audioDevices.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Default camera</label>
                  <Select
                    value={settings.default_video_device || 'default'}
                    onValueChange={(v) => update('default_video_device', v === 'default' ? '' : v)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="System default" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0d0818] border-white/10 text-white">
                      <SelectItem value="default">System default</SelectItem>
                      {videoDevices.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
