import { supabase } from '@/integrations/supabase/client';

export type R2Folder = 'avatars' | 'meeting-files';

type PresignResponse = {
  uploadUrl: string;
  path: string;
  publicUrl: string;
  configured?: boolean;
  maxBytes?: number;
  error?: string;
};

export async function isR2StorageAvailable(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('cloudflare-health');
    if (error) return false;
    return Boolean((data as { r2?: boolean })?.r2);
  } catch {
    return false;
  }
}

export async function presignR2Upload(
  folder: R2Folder,
  fileName: string,
  mimeType: string,
  meetingId?: string,
): Promise<PresignResponse> {
  const { data, error } = await supabase.functions.invoke('meeting-r2', {
    body: {
      action: 'presign',
      folder,
      fileName,
      mimeType,
      meetingId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not prepare upload');
  }

  const payload = data as PresignResponse;
  if (payload?.error) {
    throw new Error(payload.error);
  }

  if (!payload?.uploadUrl || !payload?.publicUrl) {
    throw new Error('Invalid presign response');
  }

  return payload;
}

export async function uploadFileToR2(
  folder: R2Folder,
  file: File,
  meetingId?: string,
): Promise<{ publicUrl: string; path: string }> {
  const presigned = await presignR2Upload(folder, file.name, file.type || 'application/octet-stream', meetingId);

  if (presigned.maxBytes && file.size > presigned.maxBytes) {
    throw new Error(`File exceeds maximum size of ${Math.round(presigned.maxBytes / (1024 * 1024))} MB`);
  }

  const uploadRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: file.type ? { 'Content-Type': file.type } : undefined,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed (${uploadRes.status})`);
  }

  return { publicUrl: presigned.publicUrl, path: presigned.path };
}

export type ConnectionHealth = {
  healthy: boolean;
  meetingSupabase: boolean;
  regalMailBridge: boolean;
  regalMailSupabase: boolean;
  r2: boolean;
  cloudflareApi: boolean;
  database: boolean;
};

export async function fetchConnectionHealth(): Promise<ConnectionHealth | null> {
  try {
    const { data, error } = await supabase.functions.invoke('cloudflare-health');
    if (error) return null;
    return data as ConnectionHealth;
  } catch {
    return null;
  }
}
