import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client (to verify identity)
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Admin client (service role — can delete users and bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all user data in order (respecting foreign keys)
    // 1. point_events
    await adminClient.from('point_events').delete().eq('user_id', userId);
    // 2. achievements
    await adminClient.from('achievements').delete().eq('user_id', userId);
    // 3. balance_snapshots
    await adminClient.from('balance_snapshots').delete().eq('user_id', userId);
    // 4. transactions
    await adminClient.from('transactions').delete().eq('user_id', userId);
    // 5. categories
    await adminClient.from('categories').delete().eq('user_id', userId);
    // 6. goal_items (via goals)
    const { data: goals } = await adminClient.from('goals').select('id').eq('user_id', userId);
    if (goals && goals.length > 0) {
      const goalIds = goals.map((g: { id: string }) => g.id);
      await adminClient.from('goal_items').delete().in('goal_id', goalIds);
    }
    // 7. goals
    await adminClient.from('goals').delete().eq('user_id', userId);
    // 8. timeline_items (via timeline_phases)
    const { data: phases } = await adminClient.from('timeline_phases').select('id').eq('user_id', userId);
    if (phases && phases.length > 0) {
      const phaseIds = phases.map((p: { id: string }) => p.id);
      await adminClient.from('timeline_items').delete().in('phase_id', phaseIds);
    }
    // 9. timeline_phases
    await adminClient.from('timeline_phases').delete().eq('user_id', userId);
    // 10. audit_log (set null on user_id, don't delete)
    await adminClient.from('audit_log').update({ user_id: null }).eq('user_id', userId);
    // 11. profile
    await adminClient.from('profiles').delete().eq('id', userId);
    // 12. Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return new Response(JSON.stringify({ error: 'Error al eliminar la cuenta de autenticacion' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('delete-account error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
