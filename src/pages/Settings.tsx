import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Save, User, Bell, Video, Mic, ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserSettings {
  notifications_enabled: boolean;
  auto_join_audio: boolean;
  auto_join_video: boolean;
  default_audio_device: string;
  default_video_device: string;
  meeting_quality: 'low' | 'medium' | 'high';
  display_name: string;
  avatar_url?: string;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    auto_join_audio: true,
    auto_join_video: true,
    default_audio_device: '',
    default_video_device: '',
    meeting_quality: 'medium',
    display_name: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadSettings();
      loadDevices();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile) {
        setSettings(prev => ({
          ...prev,
          display_name: profile.display_name || '',
          avatar_url: profile.avatar_url || ''
        }));
      }

      const savedSettings = localStorage.getItem(`user_settings_${user?.id}`);
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(device => device.kind === 'audioinput'));
      setVideoDevices(devices.filter(device => device.kind === 'videoinput'));
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: "Avatar Updated", description: "Your profile picture has been uploaded." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: settings.display_name,
        avatar_url: settings.avatar_url,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      localStorage.setItem(`user_settings_${user.id}`, JSON.stringify({
        notifications_enabled: settings.notifications_enabled,
        auto_join_audio: settings.auto_join_audio,
        auto_join_video: settings.auto_join_video,
        default_audio_device: settings.default_audio_device,
        default_video_device: settings.default_video_device,
        meeting_quality: settings.meeting_quality
      }));

      toast({ title: "Settings Saved" });
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate(-1)} variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-orange-500 p-2 rounded-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
          <Button onClick={() => signOut()} variant="destructive" size="sm">Sign Out</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader><CardTitle className="flex items-center text-lg"><User className="h-5 w-5 mr-2" />Profile</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-orange-500/50">
                    <AvatarImage src={settings.avatar_url} />
                    <AvatarFallback className="bg-slate-800 text-2xl">{settings.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity"
                  >
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                </div>
                <div className="w-full space-y-2">
                  <label className="text-sm text-gray-400">Display Name</label>
                  <Input
                    value={settings.display_name}
                    onChange={e => setSettings(s => ({ ...s, display_name: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader><CardTitle className="flex items-center text-lg"><Video className="h-5 w-5 mr-2" />Meetings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Auto-join with Video</span>
                <Switch checked={settings.auto_join_video} onCheckedChange={v => setSettings(s => ({ ...s, auto_join_video: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-join with Audio</span>
                <Switch checked={settings.auto_join_audio} onCheckedChange={v => setSettings(s => ({ ...s, auto_join_audio: v }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Quality</label>
                <Select value={settings.meeting_quality} onValueChange={(v: any) => setSettings(s => ({ ...s, meeting_quality: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20 text-white">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader><CardTitle className="flex items-center text-lg"><Mic className="h-5 w-5 mr-2" />Devices</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Default Microphone</label>
                <Select value={settings.default_audio_device} onValueChange={(v) => setSettings(s => ({ ...s, default_audio_device: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20 text-white">
                    {audioDevices.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${device.deviceId.slice(0, 8)}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Default Camera</label>
                <Select value={settings.default_video_device} onValueChange={(v) => setSettings(s => ({ ...s, default_video_device: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20 text-white">
                    {videoDevices.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId.slice(0, 8)}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader><CardTitle className="flex items-center text-lg"><Bell className="h-5 w-5 mr-2" />Notifications</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Enable Notifications</span>
                <Switch checked={settings.notifications_enabled} onCheckedChange={v => setSettings(s => ({ ...s, notifications_enabled: v }))} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={saveSettings} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-6 text-lg">
            {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
