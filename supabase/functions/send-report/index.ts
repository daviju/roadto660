import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatCurrency(n: number): string {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function generateReportHtml(profile: any, stats: any): string {
  const { totalIncome, totalExpenses, savings, savingsRate, topCategories, goals } = stats;

  const categoryBars = topCategories
    .map((c: any) => `
      <tr>
        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">${c.name}</td>
        <td style="padding:6px 0;width:50%;">
          <div style="background:#1e1b2e;border-radius:4px;overflow:hidden;height:16px;">
            <div style="background:${c.overBudget ? '#ef4444' : '#a78bfa'};width:${Math.min(100, c.pct)}%;height:100%;border-radius:4px;"></div>
          </div>
        </td>
        <td style="padding:6px 0 6px 12px;color:#e2e8f0;font-size:13px;text-align:right;white-space:nowrap;">${formatCurrency(c.spent)}</td>
      </tr>`)
    .join('');

  const goalSection = goals.length > 0
    ? goals.map((g: any) => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#e2e8f0;font-size:13px;">${g.name}</span>
          <span style="color:#a78bfa;font-size:13px;">${Math.round(g.pct)}%</span>
        </div>
        <div style="background:#1e1b2e;border-radius:4px;overflow:hidden;height:10px;">
          <div style="background:linear-gradient(90deg,#a78bfa,#7c3aed);width:${Math.min(100, g.pct)}%;height:100%;border-radius:4px;"></div>
        </div>
      </div>`).join('')
    : '<p style="color:#64748b;font-size:13px;">Sin metas activas</p>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Informe RoadTo</title></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#a78bfa,#7c3aed);border-radius:12px;padding:12px;margin-bottom:12px;">
        <span style="color:white;font-size:20px;font-weight:bold;">RoadTo</span>
      </div>
      <h1 style="color:#e2e8f0;font-size:22px;margin:8px 0 4px;">Tu informe financiero</h1>
      <p style="color:#64748b;font-size:13px;margin:0;">Hola ${profile.full_name || 'usuario'} — aqui tienes tu resumen</p>
    </div>

    <!-- KPI Grid -->
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div style="flex:1;background:#1a1625;border:1px solid #2d2640;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 4px;">Ingresos</p>
        <p style="color:#34d399;font-size:20px;font-weight:700;margin:0;">${formatCurrency(totalIncome)}</p>
      </div>
      <div style="flex:1;background:#1a1625;border:1px solid #2d2640;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 4px;">Gastos</p>
        <p style="color:#ef4444;font-size:20px;font-weight:700;margin:0;">${formatCurrency(totalExpenses)}</p>
      </div>
      <div style="flex:1;background:#1a1625;border:1px solid #2d2640;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 4px;">Ahorro</p>
        <p style="color:${savings >= 0 ? '#34d399' : '#ef4444'};font-size:20px;font-weight:700;margin:0;">${formatCurrency(savings)}</p>
      </div>
    </div>

    <!-- Savings Rate -->
    <div style="background:#1a1625;border:1px solid #2d2640;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 4px;">Tasa de ahorro</p>
      <p style="color:#a78bfa;font-size:28px;font-weight:700;margin:0;">${savingsRate}%</p>
    </div>

    <!-- Top Categories -->
    <div style="background:#1a1625;border:1px solid #2d2640;border-radius:12px;padding:16px;margin-bottom:24px;">
      <h2 style="color:#e2e8f0;font-size:14px;margin:0 0 12px;">Top 5 categorias de gasto</h2>
      <table style="width:100%;border-collapse:collapse;">${categoryBars}</table>
    </div>

    <!-- Goals -->
    <div style="background:#1a1625;border:1px solid #2d2640;border-radius:12px;padding:16px;margin-bottom:24px;">
      <h2 style="color:#e2e8f0;font-size:14px;margin:0 0 12px;">Progreso de metas</h2>
      ${goalSection}
    </div>

    <!-- Points -->
    <div style="background:#1a1625;border:1px solid #2d2640;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
      <span style="color:#fbbf24;font-size:16px;font-weight:600;">${profile.points || 0} puntos</span>
      ${profile.streak_days > 0 ? `<span style="color:#fb923c;font-size:14px;margin-left:12px;">🔥 ${profile.streak_days} dias</span>` : ''}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;border-top:1px solid #2d2640;">
      <p style="color:#64748b;font-size:12px;margin:0;">
        Gestiona tus preferencias de email en <a href="https://roadto.app" style="color:#a78bfa;">RoadTo</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
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

    // Admin client to read data
    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch profile
    const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
    if (!profile || profile.plan !== 'pro') {
      return new Response(JSON.stringify({ error: 'Esta funcion requiere plan PRO' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recent transactions (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const { data: txs } = await admin
      .from('transactions')
      .select('*, categories(name, monthly_budget)')
      .eq('user_id', user.id)
      .gte('transaction_date', threeMonthsAgo.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false });

    const transactions = txs || [];

    // Calculate stats
    const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
    const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

    // Top categories
    const catMap = new Map<string, { name: string; spent: number; budget: number }>();
    transactions
      .filter((t: any) => t.type === 'expense')
      .forEach((t: any) => {
        const name = t.categories?.name || 'Sin categoria';
        const existing = catMap.get(name) || { name, spent: 0, budget: t.categories?.monthly_budget || 0 };
        existing.spent += t.amount;
        catMap.set(name, existing);
      });
    const topCategories = [...catMap.values()]
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        spent: c.spent,
        pct: c.budget > 0 ? (c.spent / c.budget) * 100 : 50,
        overBudget: c.budget > 0 && c.spent > c.budget,
      }));

    // Goals
    const { data: goalsData } = await admin
      .from('goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', user.id)
      .eq('status', 'active');
    const goals = (goalsData || []).map((g: any) => ({
      name: g.name,
      pct: g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
    }));

    // Generate HTML
    const html = generateReportHtml(profile, { totalIncome, totalExpenses, savings, savingsRate, topCategories, goals });

    // Send via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'RoadTo <informes@roadto.app>',
        to: [profile.email],
        subject: `Tu informe financiero — RoadTo`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Error al enviar el email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last sent date
    await admin
      .from('profiles')
      .update({ email_reports_last_sent: new Date().toISOString() })
      .eq('id', user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-report error:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
