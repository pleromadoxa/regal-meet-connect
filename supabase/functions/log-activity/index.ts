import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogActivityRequest {
  action: string;
  user_id?: string;
}

// Function to get country from IP using a free geolocation service
async function getCountryFromIP(ipAddress: string): Promise<string | null> {
  try {
    // Skip if it's a local/private IP
    if (ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
      return 'Local';
    }

    // Use ip-api.com (free service, 1000 requests per minute)
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=country,countryCode`);
    
    if (response.ok) {
      const data = await response.json();
      return data.country || data.countryCode || null;
    }
  } catch (error) {
    console.error('Error getting country from IP:', error);
  }
  return null;
}

// Function to extract real IP from various headers
function getRealIP(request: Request): string {
  // Try various headers that might contain the real IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  const xClientIP = request.headers.get('x-client-ip');
  
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (xRealIP) {
    return xRealIP;
  }
  
  if (xClientIP) {
    return xClientIP;
  }
  
  // Fallback - this might be a proxy IP in production
  return 'unknown';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { action, user_id }: LogActivityRequest = await req.json();

      if (!action) {
        return new Response(
          JSON.stringify({ error: 'Action is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Extract client information
      const ipAddress = getRealIP(req);
      const userAgent = req.headers.get('user-agent') || null;
      
      console.log('Logging activity:', { action, user_id, ipAddress, userAgent });

      // Get country from IP address
      let country: string | null = null;
      if (ipAddress && ipAddress !== 'unknown') {
        country = await getCountryFromIP(ipAddress);
      }

      // Insert log entry with all available information
      const { data, error } = await supabaseClient
        .from('platform_usage_logs')
        .insert({
          user_id: user_id || null,
          action: action,
          ip_address: ipAddress !== 'unknown' ? ipAddress : null,
          user_agent: userAgent,
          country: country,
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging activity:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to log activity', details: error.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Activity logged successfully:', data);

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            id: data.id,
            ip_address: ipAddress,
            country: country,
            user_agent: userAgent
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});