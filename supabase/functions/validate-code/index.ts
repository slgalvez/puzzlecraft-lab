import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate a short-lived HMAC-signed ticket (5 min expiry)
async function generateTicket(): Promise<string> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const payload = {
    purpose: 'access_gate',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  };
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const headerB64 = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    'HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string' || code.length > 200) {
      console.log(`[${new Date().toISOString()}] ATTEMPT code="${String(code).slice(0, 50)}" result=INVALID`);
      return new Response(
        JSON.stringify({ type: 'invalid' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmed = code.trim();
    const unlockPhrase = Deno.env.get('PUZZLE_UNLOCK_PHRASE');
    const testPhrase = Deno.env.get('TEST_UNLOCK_PHRASE');

    // Check for special unlock (primary or test phrase)
    if ((unlockPhrase && trimmed === unlockPhrase) || (testPhrase && trimmed === testPhrase)) {
      console.log(`[${new Date().toISOString()}] ATTEMPT code="[REDACTED]" result=UNLOCK_SUCCESS`);
      const ticket = await generateTicket();
      return new Response(
        JSON.stringify({ type: 'unlock', ticket }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's a pure numeric seed
    if (/^\d+$/.test(trimmed)) {
      console.log(`[${new Date().toISOString()}] ATTEMPT code="${trimmed}" result=NUMERIC_SEED`);
      return new Response(
        JSON.stringify({ type: 'seed', seed: parseInt(trimmed) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check type-seed format (e.g. "sudoku-12345")
    const validTypes = ['sudoku', 'crossword', 'word-search', 'kakuro', 'nonogram', 'cryptogram', 'word-fill', 'number-fill'];
    const dashIdx = trimmed.lastIndexOf('-');
    if (dashIdx > 0) {
      const typePart = trimmed.slice(0, dashIdx).toLowerCase();
      const seedPart = trimmed.slice(dashIdx + 1);
      if (validTypes.includes(typePart) && seedPart && /^\d+$/.test(seedPart)) {
        console.log(`[${new Date().toISOString()}] ATTEMPT code="${trimmed}" result=TYPE_SEED`);
        return new Response(
          JSON.stringify({ type: 'type-seed', puzzleType: typePart, seed: parseInt(seedPart) }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if it's just a type name
    const lower = trimmed.toLowerCase().replace(/\s+/g, '-');
    if (validTypes.includes(lower)) {
      console.log(`[${new Date().toISOString()}] ATTEMPT code="${trimmed}" result=TYPE_NAME`);
      return new Response(
        JSON.stringify({ type: 'type-name', puzzleType: lower }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Not recognized
    console.log(`[${new Date().toISOString()}] ATTEMPT code="${trimmed.slice(0, 20)}" result=NOT_FOUND`);
    return new Response(
      JSON.stringify({ type: 'not-found' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR:`, error);
    return new Response(
      JSON.stringify({ type: 'error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
