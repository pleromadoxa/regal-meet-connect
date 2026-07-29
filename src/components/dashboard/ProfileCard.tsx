import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Mail, Pencil, Settings, X } from 'lucide-react';
import { ProfileAvatar } from '@/components/ProfileAvatar';

interface ProfileCardProps {
  userName: string;
  displayName: string;
  userEmail: string;
  avatarUrl?: string | null;
  isEditingProfile: boolean;
  onSetDisplayName: (name: string) => void;
  onSetIsEditingProfile: (editing: boolean) => void;
  onUpdateProfile: () => void;
}

export const ProfileCard = ({
  userName,
  displayName,
  userEmail,
  avatarUrl,
  isEditingProfile,
  onSetDisplayName,
  onSetIsEditingProfile,
  onUpdateProfile,
}: ProfileCardProps) => {
  const navigate = useNavigate();
  const shownName = userName || displayName || userEmail?.split('@')[0] || 'User';

  return (
    <Card className="overflow-hidden bg-white/10 backdrop-blur-xl border-white/20 h-full">
      <div className="h-20 bg-gradient-to-r from-orange-500/40 via-purple-600/30 to-indigo-600/20" />
      <CardContent className="relative px-5 pb-5 pt-0">
        <div className="-mt-12 mb-4 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left sm:gap-4">
          <ProfileAvatar
            avatarUrl={avatarUrl}
            displayName={shownName}
            email={userEmail}
            size="xl"
            className="border-4 border-[#1a1028]"
          />
          <div className="mt-3 min-w-0 flex-1 sm:mt-0 sm:pb-1">
            <h2 className="truncate text-xl font-bold text-white">{shownName}</h2>
            <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-white/60 sm:justify-start">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{userEmail}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/10 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-white/50">
              Display name
            </label>
            {isEditingProfile ? (
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => onSetDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/40"
                  autoFocus
                />
                <Button
                  onClick={onUpdateProfile}
                  size="icon"
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                  aria-label="Save display name"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    onSetDisplayName(userName);
                    onSetIsEditingProfile(false);
                  }}
                  size="icon"
                  variant="outline"
                  className="shrink-0 border-white/25 text-white hover:bg-white/10"
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
                  {userName || 'Not set'}
                </p>
                <Button
                  onClick={() => {
                    onSetDisplayName(userName);
                    onSetIsEditingProfile(true);
                  }}
                  size="icon"
                  variant="outline"
                  className="shrink-0 border-white/25 text-white hover:bg-white/10"
                  aria-label="Edit display name"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={() => navigate('/settings')}
            variant="outline"
            className="w-full border-white/25 bg-white/5 text-white hover:bg-white/15"
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit profile & photo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
