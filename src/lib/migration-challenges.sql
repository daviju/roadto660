-- ═══════════════════════════════════════════════════════════════
-- RoadTo - Migracion: tabla challenges + default emergency_fund
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Cambiar default de emergency_fund de 2000 a 0
ALTER TABLE profiles ALTER COLUMN emergency_fund SET DEFAULT 0;

-- 2. Crear tabla de retos mensuales
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  type TEXT NOT NULL CHECK (type IN ('no_spend_day', 'reduce_category', 'save_amount', 'log_daily', 'under_budget')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indice para queries por usuario + mes
CREATE INDEX IF NOT EXISTS idx_challenges_user_month ON challenges(user_id, month);

-- 4. RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Helper function (puede que ya exista)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Users manage own challenges" ON challenges
  FOR ALL USING (auth.uid() = user_id OR is_admin());
