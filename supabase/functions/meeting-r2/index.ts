import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import {
  buildObjectKey,
  isR2Configured,
  presignUpload,
  readR2Config,
  type R2Folder,
} from '../_shared/r2.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  action?: 'presign';
  folder?: string;
  fileName?: string;
  mimeType?: string;
  meetingId?: string;
};

const MAX_FILE_BYTES: Record<R2Folder, number> = {
  avatars: 5 * 1024 * 1024,
  'meeting-files': 50 * 1024 * 1024,
  brand: 2 * 1024 * 1024,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const config = readR2Config();
  if (!config || !isR2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 storage is not configured', configured: false }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ') || !supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as Body;
    const action = body.action ?? 'presign';
    if (action !== 'presign') {
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const folder = (body.folder ?? 'avatars') as R2Folder;
    if (!['avatars', 'meeting-files', 'brand'].includes(folder)) {
      return new Response(JSON.stringify({ error: 'Invalid folder' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileName = String(body.fileName ?? 'file.bin').trim();
    const mimeType = String(body.mimeType ?? 'application/octet-stream').trim();
    const meetingId = body.meetingId?.trim();

    if (folder === 'meeting-files' && !meetingId) {
      return new Response(JSON.stringify({ error: 'meetingId is required for meeting-files' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const objectKey = buildObjectKey(user.id, folder, fileName, meetingId);
    const presigned = await presignUpload(config, objectKey, mimeType);

    return new Response(
      JSON.stringify({
        ...presigned,
        configured: true,
        maxBytes: MAX_FILE_BYTES[folder],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[meeting-r2]', error);
    return new Response(
      JSON.stringify({ error: 'Presign failed', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
