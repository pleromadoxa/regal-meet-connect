import type { User } from '@supabase/supabase-js';

type ProfileLike = {
  avatar_url?: string | null;
} | null | undefined;

export function resolveAvatarUrl(profile: ProfileLike, user: User | null | undefined): string | null {
  if (profile?.avatar_url) return profile.avatar_url;

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  if (!meta) return null;

  if (typeof meta.avatar_url === 'string' && meta.avatar_url) return meta.avatar_url;
  if (typeof meta.picture === 'string' && meta.picture) return meta.picture;
  if (typeof meta.avatar === 'string' && meta.avatar) return meta.avatar;

  return null;
}

export function profileInitials(name: string | null | undefined, email?: string | null): string {
  const source = (name?.trim() || email?.split('@')[0] || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.charAt(0).toUpperCase();
}
