import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Check for special unlock
    if (unlockPhrase && trimmed === unlockPhrase) {
      console.log(`[${new Date().toISOString()}] ATTEMPT code="[REDACTED]" result=UNLOCK_SUCCESS`);
      return new Response(
        JSON.stringify({ type: 'unlock', destination: '/p' }),
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
