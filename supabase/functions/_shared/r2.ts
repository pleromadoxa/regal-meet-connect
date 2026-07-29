import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from 'npm:@aws-sdk/client-s3@3.726.1';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.726.1';

export type R2Folder = 'avatars' | 'meeting-files' | 'brand';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  endpoint: string;
};

export function readR2Config(): R2Config | null {
  const accountId = (Deno.env.get('R2_ACCOUNT_ID') ?? '').trim();
  const accessKeyId = (Deno.env.get('R2_ACCESS_KEY_ID') ?? '').trim();
  const secretAccessKey = (Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '').trim();
  const bucket = (Deno.env.get('R2_BUCKET_NAME') ?? '').trim();
  const publicUrl = (Deno.env.get('R2_PUBLIC_URL') ?? '').trim().replace(/\/$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  const customEndpoint = (Deno.env.get('R2_S3_ENDPOINT') ?? '').trim().replace(/\/$/, '');
  const endpoint =
    customEndpoint || `https://${accountId}.r2.cloudflarestorage.com`;

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl, endpoint };
}

export function isR2Configured(): boolean {
  return readR2Config() != null;
}

function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function buildObjectKey(
  userId: string,
  folder: R2Folder,
  fileName: string,
  meetingId?: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const prefix =
    folder === 'meeting-files' && meetingId
      ? `meeting/${userId}/${meetingId}`
      : `${folder}/${userId}`;
  return `${prefix}/${Date.now()}-${safeName}`;
}

export function publicObjectUrl(config: R2Config, objectKey: string): string {
  return `${config.publicUrl}/${objectKey}`;
}

export async function presignUpload(
  config: R2Config,
  objectKey: string,
  _mimeType: string,
  expiresInSec = 3600,
): Promise<{ uploadUrl: string; path: string; publicUrl: string }> {
  const client = createR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSec });
  return {
    uploadUrl,
    path: objectKey,
    publicUrl: publicObjectUrl(config, objectKey),
  };
}

export async function deleteR2Objects(config: R2Config, paths: string[]): Promise<number> {
  const keys = [...new Set(paths.map((p) => p.trim()).filter(Boolean))];
  if (keys.length === 0) return 0;

  const client = createR2Client(config);
  await client.send(
    new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
        Quiet: true,
      },
    }),
  );
  return keys.length;
}

export function isR2PublicUrl(config: R2Config, url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith(config.publicUrl);
}
