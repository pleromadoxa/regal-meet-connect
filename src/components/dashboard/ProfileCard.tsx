
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Edit } from 'lucide-react';

interface ProfileCardProps {
  userName: string;
  displayName: string;
  userEmail: string;
  isEditingProfile: boolean;
  onSetUserName: (name: string) => void;
  onSetDisplayName: (name: string) => void;
  onSetIsEditingProfile: (editing: boolean) => void;
  onUpdateProfile: () => void;
}

export const ProfileCard = ({
  userName,
  displayName,
  userEmail,
  isEditingProfile,
  onSetUserName,
  onSetDisplayName,
  onSetIsEditingProfile,
  onUpdateProfile
}: ProfileCardProps) => {
  return (
    <Card className="bg-white/10 backdrop-blur-xl border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <User className="h-5 w-5 mr-2" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-white/90">Display Name</label>
          <div className="flex items-center space-x-2">
            <Input
              value={isEditingProfile ? displayName : userName}
              onChange={(e) => isEditingProfile ? onSetDisplayName(e.target.value) : onSetUserName(e.target.value)}
              placeholder="Enter your display name"
              className="bg-white/20 border-white/30 text-white placeholder-white/60"
              disabled={!isEditingProfile}
            />
            <Button
              onClick={isEditingProfile ? onUpdateProfile : () => onSetIsEditingProfile(true)}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          {isEditingProfile && (
            <Button
              onClick={() => onSetIsEditingProfile(false)}
              variant="outline"
              size="sm"
              className="mt-2 border-white/30 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-white/90">Email</label>
          <Input
            value={userEmail || ''}
            disabled
            className="bg-white/10 border-white/20 text-white/70"
          />
        </div>
      </CardContent>
    </Card>
  );
};
