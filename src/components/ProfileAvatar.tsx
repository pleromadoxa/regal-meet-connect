import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { profileInitials } from '@/lib/profileAvatar';

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}

const sizeClasses = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
  xl: 'h-28 w-28 text-3xl sm:h-32 sm:w-32',
};

export function ProfileAvatar({
  avatarUrl,
  displayName,
  email,
  size = 'md',
  className,
  ring = true,
}: ProfileAvatarProps) {
  const initials = profileInitials(displayName, email);

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center font-semibold text-white shrink-0',
        sizeClasses[size],
        ring && 'ring-2 ring-white/25 shadow-lg shadow-black/20',
        className
      )}
      aria-hidden={!displayName && !email}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className={size === 'xl' ? 'h-12 w-12' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'} />
      )}
    </div>
  );
}
