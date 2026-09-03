import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Loader2, Mic, Palette, Save, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PRODUCT_NAME } from '@/constants/site';
import { SETTINGS_TABS, type SettingsTabId } from '@/constants/navigation';
import { RegalMeetingPlanPanel } from '@/components/settings/RegalMeetingPlanPanel';
import { SettingsNav } from '@/components/settings/SettingsNav';
import {
  SettingsSection,
  SettingsToggleRow,
  settingsCardClass,
  settingsInputClass,
} from '@/components/settings/SettingsSection';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { resolveAvatarUrl } from '@/lib/profileAvatar';
import { RegalAppShell } from '@/components/layout/RegalAppShell';
import { RegalPageLoader } from '@/components/layout/RegalPageLoader';

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

const isSettingsTab = (value: string | null): value is SettingsTabId =>
  SETTINGS_TABS.some((tab) => tab.id === value);

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: SettingsTabId = isSettingsTab(tabParam) ? tabParam : 'profile';

  useDocumentTitle('Settings');
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const setActiveTab = (tab: SettingsTabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent('/settings')}`, { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setPageLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setPageLoading(true);
      const timeout = window.setTimeout(() => {
        if (!cancelled) setPageLoading(false);
      }, 8000);

      try {
        const [profileRes, settingsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;

        const next = { ...DEFAULTS };
        if (profileRes.data) {
          const p = profileRes.data as Record<string, unknown>;
          next.display_name =
            (typeof p.display_name === 'string' && p.display_name) ||
            (typeof p.full_name === 'string' && p.full_name) ||
            '';
          next.avatar_url =
            (profileRes.data.avatar_url as string) ||
            resolveAvatarUrl(profileRes.data, user) ||
            '';
          next.bio = (typeof p.bio === 'string' && p.bio) || '';
        }
        if (settingsRes.data) {
          const s = settingsRes.data as Record<string, unknown>;
          next.email_notifications = (s.email_notifications as boolean | undefined) ?? true;
          next.push_notifications = (s.push_notifications as boolean | undefined) ?? true;
          next.meeting_reminders = (s.meeting_reminders as boolean | undefined) ?? true;
          next.sound_enabled = (s.sound_enabled as boolean | undefined) ?? true;
          next.camera_default_on = (s.camera_default_on as boolean | undefined) ?? true;
          next.microphone_default_on = (s.microphone_default_on as boolean | undefined) ?? false;
          next.theme = (typeof s.theme === 'string' && s.theme) || 'system';
          next.language = (typeof s.language === 'string' && s.language) || 'en';
        }

        const local = localStorage.getItem(`device_prefs_${user.id}`);
        if (local) {
          try {
            const parsed = JSON.parse(local) as {
              default_audio_device?: string;
              default_video_device?: string;
            };
            next.default_audio_device = parsed.default_audio_device || '';
            next.default_video_device = parsed.default_video_device || '';
          } catch {
            // ignore invalid local prefs
          }
        }

        if (!next.avatar_url) {
          next.avatar_url = resolveAvatarUrl(null, user) || '';
        }

        setSettings(next);
        if (next.theme) setTheme(next.theme);
      } catch (err) {
        console.error('Load settings error:', err);
        toast({ title: 'Could not load settings', variant: 'destructive' });
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setPageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, setTheme, toast]);

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
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: settings.display_name,
        full_name: settings.display_name || null,
        avatar_url: settings.avatar_url || null,
        bio: settings.bio || null,
      });
      if (profErr) throw profErr;

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

      localStorage.setItem(
        `device_prefs_${user.id}`,
        JSON.stringify({
          default_audio_device: settings.default_audio_device,
          default_video_device: settings.default_video_device,
        })
      );

      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
      if (settings.theme) setTheme(settings.theme);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || pageLoading) {
    return <RegalPageLoader message={authLoading ? 'Checking session…' : 'Loading settings…'} />;
  }

  if (!user) {
    return <RegalPageLoader message="Redirecting to sign in…" />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Card className={settingsCardClass}>
            <div className="h-24 bg-gradient-to-r from-orange-500/30 via-orange-500/10 to-transparent sm:h-28" />
            <CardContent className="relative px-5 pb-6 pt-0 sm:px-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                <div className="-mt-14 flex flex-col items-center sm:-mt-16 sm:items-start">
                  <ProfileAvatar
                    avatarUrl={settings.avatar_url}
                    displayName={settings.display_name || user.email}
                    email={user.email}
                    size="xl"
                    className="border-4 border-[#0a0a0a]"
                  />
                  <div className="mt-4 w-full sm:w-auto">
                    <AvatarUpload
                      userId={user.id}
                      avatarUrl={settings.avatar_url}
                      displayName={settings.display_name || user.email || ''}
                      onUpload={(url) => update('avatar_url', url)}
                      compact
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-5 pt-2 sm:pt-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {settings.display_name || user.email?.split('@')[0] || 'Your profile'}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{user.email}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90">Display name</label>
                    <Input
                      value={settings.display_name}
                      onChange={(e) => update('display_name', e.target.value)}
                      placeholder="Your name"
                      className={settingsInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90">Email</label>
                    <Input
                      value={user.email || ''}
                      disabled
                      className="border-white/10 bg-white/5 text-white/60"
                    />
                    <p className="text-xs text-white/45">Managed through your Regal Mail account</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90">Bio</label>
                    <Textarea
                      value={settings.bio}
                      onChange={(e) => update('bio', e.target.value)}
                      placeholder="Tell others about you"
                      rows={4}
                      className="resize-none rounded-xl border-white/12 bg-[#111111] text-white placeholder:text-white/30 focus-visible:ring-orange-500/40"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      variant="premium"
                      className="shadow-[0_0_16px_rgba(255,107,53,0.25)]"
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => signOut()}
                      className="border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                    >
                      Sign out
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'appearance':
        return (
          <SettingsSection
            title="Appearance"
            description="Choose how Regal Meeting looks on your devices."
            icon={Palette}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Theme</label>
              <Select
                value={settings.theme}
                onValueChange={(v) => {
                  update('theme', v);
                  setTheme(v);
                }}
              >
                <SelectTrigger className={settingsInputClass}>
                  <SelectValue placeholder="Choose theme" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0d0d0d] text-white">
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Language</label>
              <Select value={settings.language} onValueChange={(v) => update('language', v)}>
                <SelectTrigger className={settingsInputClass}>
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0d0d0d] text-white">
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingsSection>
        );

      case 'notifications':
        return (
          <SettingsSection
            title="Notifications"
            description="Control how Regal Meeting keeps you in the loop."
            icon={Bell}
          >
            <SettingsToggleRow
              title="Email notifications"
              description="Meeting invites and reminders by email"
              checked={settings.email_notifications}
              onCheckedChange={(v) => update('email_notifications', v)}
            />
            <SettingsToggleRow
              title="Push notifications"
              description="In-app notifications when meetings start"
              checked={settings.push_notifications}
              onCheckedChange={(v) => update('push_notifications', v)}
            />
            <SettingsToggleRow
              title="Meeting reminders"
              description="Reminders before calendar events and scheduled meetings"
              checked={settings.meeting_reminders}
              onCheckedChange={(v) => update('meeting_reminders', v)}
            />
            <SettingsToggleRow
              title="Sound effects"
              description="Play sounds for join, leave, and chat"
              checked={settings.sound_enabled}
              onCheckedChange={(v) => update('sound_enabled', v)}
            />
          </SettingsSection>
        );

      case 'devices':
        return (
          <SettingsSection
            title="Devices & defaults"
            description="Choose your preferred camera and microphone for meetings."
            icon={Mic}
          >
            <SettingsToggleRow
              title="Camera on by default"
              description="Start meetings with your camera enabled"
              checked={settings.camera_default_on}
              onCheckedChange={(v) => update('camera_default_on', v)}
            />
            <SettingsToggleRow
              title="Microphone on by default"
              description="Start meetings unmuted"
              checked={settings.microphone_default_on}
              onCheckedChange={(v) => update('microphone_default_on', v)}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Default microphone</label>
              <Select
                value={settings.default_audio_device || 'default'}
                onValueChange={(v) => update('default_audio_device', v === 'default' ? '' : v)}
              >
                <SelectTrigger className={settingsInputClass}>
                  <SelectValue placeholder="System default" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0d0d0d] text-white">
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
                <SelectTrigger className={settingsInputClass}>
                  <SelectValue placeholder="System default" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0d0d0d] text-white">
                  <SelectItem value="default">System default</SelectItem>
                  {videoDevices.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SettingsSection>
        );

      case 'plan':
        return <RegalMeetingPlanPanel />;

      default:
        return null;
    }
  };

  return (
    <RegalAppShell
      title="Settings"
      subtitle={`Manage your ${PRODUCT_NAME} preferences`}
      user={user}
      profile={{ display_name: settings.display_name, avatar_url: settings.avatar_url }}
      onSignOut={signOut}
      showSettingsLink={false}
      maxWidthClass="max-w-6xl"
      headerActions={
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="premium"
          size="sm"
          className="shadow-[0_0_16px_rgba(255,107,53,0.25)]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">Save changes</span>
        </Button>
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="lg:w-72 lg:shrink-0">
          <SettingsNav active={activeTab} onChange={setActiveTab} />
        </aside>
        <div className="min-w-0 flex-1">{renderTabContent()}</div>
      </div>
    </RegalAppShell>
  );
};

export default Settings;
