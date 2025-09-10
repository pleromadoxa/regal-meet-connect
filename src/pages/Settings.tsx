
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Save, User, Bell, Video, Mic, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [isMobile, setIsMobile] = useState(false);
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
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadSettings();
    loadDevices();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      // Load profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setSettings(prev => ({
          ...prev,
          display_name: profile.display_name || '',
          avatar_url: profile.avatar_url || ''
        }));
      }

      // Load user settings (we'll create this table)
      const savedSettings = localStorage.getItem(`user_settings_${user.id}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
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

  const saveSettings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Save profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: settings.display_name,
          avatar_url: settings.avatar_url
        });

      if (profileError) throw profileError;

      // Save other settings to localStorage (in a real app, you'd save to a user_settings table)
      const settingsToSave = {
        notifications_enabled: settings.notifications_enabled,
        auto_join_audio: settings.auto_join_audio,
        auto_join_video: settings.auto_join_video,
        default_audio_device: settings.default_audio_device,
        default_video_device: settings.default_video_device,
        meeting_quality: settings.meeting_quality
      };
      
      localStorage.setItem(`user_settings_${user.id}`, JSON.stringify(settingsToSave));

      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // The useAuth hook now handles navigation, so we don't need manual navigation here
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force navigation as fallback
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row items-center justify-between'} gap-4 mb-8`}>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="p-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-2xl">
              <Crown className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
            </div>
            <div>
              <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-white drop-shadow-lg`}>
                Settings
              </h1>
              <p className={`text-blue-200 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Manage your Regal Meet preferences
              </p>
            </div>
          </div>

          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className={`bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 ${isMobile ? 'self-start' : ''}`}
          >
            Sign Out
          </Button>
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
          {/* Profile Settings */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader className="pb-4">
              <CardTitle className={`text-white flex items-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <User className="h-5 w-5 mr-2" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/90">
                  Display Name
                </label>
                <Input
                  value={settings.display_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Enter your display name"
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/90">
                  Email
                </label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-white/10 border-white/20 text-white/70 mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Meeting Settings */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader className="pb-4">
              <CardTitle className={`text-white flex items-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <Video className="h-5 w-5 mr-2" />
                Meeting Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">
                  Auto-join with video
                </label>
                <Switch
                  checked={settings.auto_join_video}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_join_video: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">
                  Auto-join with audio
                </label>
                <Switch
                  checked={settings.auto_join_audio}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_join_audio: checked }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/90">
                  Video Quality
                </label>
                <Select
                  value={settings.meeting_quality}
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setSettings(prev => ({ ...prev, meeting_quality: value }))
                  }
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/20">
                    <SelectItem value="low" className="text-white hover:bg-white/10">
                      Low (Better for slow connections)
                    </SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-white/10">
                      Medium (Balanced)
                    </SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-white/10">
                      High (Best quality)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Device Settings */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader className="pb-4">
              <CardTitle className={`text-white flex items-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <Mic className="h-5 w-5 mr-2" />
                Device Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/90">
                  Default Microphone
                </label>
                <Select
                  value={settings.default_audio_device}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, default_audio_device: value }))}
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white mt-1">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/20">
                    {audioDevices.map((device) => (
                      <SelectItem
                        key={device.deviceId}
                        value={device.deviceId}
                        className="text-white hover:bg-white/10"
                      >
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-white/90">
                  Default Camera
                </label>
                <Select
                  value={settings.default_video_device}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, default_video_device: value }))}
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white mt-1">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/20">
                    {videoDevices.map((device) => (
                      <SelectItem
                        key={device.deviceId}
                        value={device.deviceId}
                        className="text-white hover:bg-white/10"
                      >
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader className="pb-4">
              <CardTitle className={`text-white flex items-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">
                  Enable notifications
                </label>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifications_enabled: checked }))}
                />
              </div>
              <p className="text-xs text-white/60">
                Get notified when someone joins your meeting or sends a message
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={saveSettings}
            disabled={loading}
            className={`bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white ${
              isMobile ? 'px-6 py-2 text-sm' : 'px-8 py-3'
            }`}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
