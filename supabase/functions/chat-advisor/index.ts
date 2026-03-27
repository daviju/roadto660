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
    const { message } = await req.json();
    if (!message || typeof message !== 'string' || message.length > 1000) {
      return new Response(JSON.stringify({ error: 'Mensaje invalido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Servicio de chat no configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
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

    // Admin client
    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch profile
    const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Perfil no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: check daily message count for free users
    // PRO: unlimited, Free: 5/day
    if (profile.plan !== 'pro') {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await admin
        .from('point_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reason', 'chat_message')
        .gte('created_at', `${today}T00:00:00`);

      if ((count || 0) >= 5) {
        return new Response(JSON.stringify({ error: 'Has alcanzado el limite de 5 mensajes diarios. Actualiza a PRO para mensajes ilimitados.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the message for counting
      await admin.from('point_events').insert({
        user_id: user.id,
        points: 0,
        reason: 'chat_message',
      });
    }

    // Fetch last 3 months of transactions
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const { data: txs } = await admin
      .from('transactions')
      .select('amount, type, concept, transaction_date, categories(name, monthly_budget)')
      .eq('user_id', user.id)
      .gte('transaction_date', threeMonthsAgo.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false })
      .limit(200);

    const transactions = txs || [];

    // Calculate aggregates
    const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
    const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
    const avgMonthlyIncome = totalIncome / 3;
    const avgMonthlyExpenses = totalExpenses / 3;
    const avgSavings = avgMonthlyIncome - avgMonthlyExpenses;

    // Category spending
    const catMap = new Map<string, { name: string; spent: number; budget: number }>();
    transactions
      .filter((t: any) => t.type === 'expense')
      .forEach((t: any) => {
        const name = t.categories?.name || 'Sin categoria';
        const existing = catMap.get(name) || { name, spent: 0, budget: t.categories?.monthly_budget || 0 };
        existing.spent += t.amount;
        catMap.set(name, existing);
      });
    const categorySpending = [...catMap.values()]
      .sort((a, b) => b.spent - a.spent)
      .map((c) => `- ${c.name}: gasto ${(c.spent / 3).toFixed(0)}€/mes${c.budget > 0 ? `, presupuesto ${c.budget}€ (${Math.round((c.spent / 3 / c.budget) * 100)}%)` : ''}`)
      .join('\n');

    // Goals
    const { data: goalsData } = await admin
      .from('goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', user.id)
      .eq('status', 'active');
    const goalsInfo = (goalsData || [])
      .map((g: any) => `- ${g.name}: objetivo ${g.target_amount}€, progreso ${g.current_amount}€ (${Math.round((g.current_amount / g.target_amount) * 100)}%)`)
      .join('\n') || 'Sin metas activas';

    // Build system prompt
    const systemPrompt = `Eres un asesor financiero personal integrado en la app RoadTo.
Tu objetivo es ayudar al usuario a alcanzar sus metas de ahorro.

DATOS DEL USUARIO:
- Nombre: ${profile.full_name || 'Usuario'}
- Ingresos mensuales: ${profile.monthly_income}€
- Dia de cobro: ${profile.pay_day}
- Ahorro mensual medio (ultimos 3 meses): ${avgSavings.toFixed(0)}€
- Gasto mensual medio: ${avgMonthlyExpenses.toFixed(0)}€
- Puntos: ${profile.points}, Racha: ${profile.streak_days} dias

PRESUPUESTOS Y GASTOS (media mensual ultimos 3 meses):
${categorySpending || 'Sin datos de categorias'}

METAS ACTIVAS:
${goalsInfo}

REGLAS:
- Responde en espanol, de forma directa y util
- Usa datos reales del usuario para los calculos
- Si te piden proyecciones, calcula con los datos reales
- Se especifico: menciona categorias, importes y fechas concretas
- Si el usuario pregunta algo fuera de finanzas, redirige amablemente
- Maximo 200 palabras por respuesta
- Usa emojis con moderacion para hacer la respuesta mas visual`;

    // Call Anthropic API
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('Anthropic API error:', err);
      return new Response(JSON.stringify({ error: 'Error al obtener respuesta del asesor' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await apiRes.json();
    const reply = data.content?.[0]?.text || 'No pude generar una respuesta.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('chat-advisor error:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
