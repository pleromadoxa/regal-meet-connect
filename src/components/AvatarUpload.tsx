import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToR2 } from '@/services/cloudflareStorage';
import { ProfileAvatar } from '@/components/ProfileAvatar';

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  displayName?: string;
  onUpload: (url: string) => void;
  /** Hide the preview circle — use when avatar is shown elsewhere */
  compact?: boolean;
}

export const AvatarUpload = ({
  userId,
  avatarUrl,
  displayName,
  onUpload,
  compact = false,
}: AvatarUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum size is 5 MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let publicUrl: string;

      try {
        const r2 = await uploadFileToR2('avatars', file);
        publicUrl = r2.publicUrl;
      } catch {
        const ext = file.name.split('.').pop() || 'png';
        const path = `${userId}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        publicUrl = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: userId, avatar_url: publicUrl });
      if (updateError) throw updateError;

      onUpload(publicUrl);
      toast({ title: 'Avatar updated', description: 'Your new photo is live.' });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={compact ? 'flex flex-col items-center sm:items-start gap-2' : 'flex items-center gap-4'}>
      {!compact && (
        <div className="relative">
          <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} size="lg" />
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-white/15 hover:bg-white/25 text-white border-white/20"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
        </Button>
        <p className="text-xs text-white/50 text-center sm:text-left">PNG, JPG up to 5 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};
