-- ═══════════════════════════════════════════════════════════════
-- RoadTo660 - Esquema completo de base de datos (Supabase)
-- Ejecutar en Supabase SQL Editor en orden
-- ═══════════════════════════════════════════════════════════════

-- ─── PROFILES ─────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  monthly_income NUMERIC DEFAULT 0,
  pay_day INTEGER DEFAULT 28,
  emergency_fund NUMERIC DEFAULT 2000,
  currency TEXT DEFAULT 'EUR',
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  module_expenses BOOLEAN DEFAULT true,
  module_income BOOLEAN DEFAULT true,
  module_budgets BOOLEAN DEFAULT true,
  module_timeline BOOLEAN DEFAULT true,
  module_motorcycles BOOLEAN DEFAULT false,
  module_charts BOOLEAN DEFAULT true,
  module_tips BOOLEAN DEFAULT true,
  module_simulator BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── CATEGORIES ───────────────────────────────────────────────
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT '#94a3b8',
  icon TEXT DEFAULT 'circle',
  monthly_budget NUMERIC DEFAULT 0,
  is_temporary BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- ─── TRANSACTIONS ─────────────────────────────────────────────
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  concept TEXT,
  transaction_date DATE NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'excel_import')),
  original_concept TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_user_cat ON transactions(user_id, category_id);

-- ─── GOALS ────────────────────────────────────────────────────
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL,
  target_amount_min NUMERIC,
  target_amount_max NUMERIC,
  recurring_cost_annual NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT 'target',
  is_active BOOLEAN DEFAULT false,
  is_achieved BOOLEAN DEFAULT false,
  achieved_date DATE,
  target_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── GOAL ITEMS ───────────────────────────────────────────────
CREATE TABLE goal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TIMELINE PHASES ──────────────────────────────────────────
CREATE TABLE timeline_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TIMELINE ITEMS ───────────────────────────────────────────
CREATE TABLE timeline_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID REFERENCES timeline_phases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── BALANCE SNAPSHOTS ────────────────────────────────────────
CREATE TABLE balance_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  balance NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- ─── ACHIEVEMENTS ─────────────────────────────────────────────
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

-- ─── POINT EVENTS ─────────────────────────────────────────────
CREATE TABLE point_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if current user is banned
CREATE OR REPLACE FUNCTION is_banned()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

-- CATEGORIES
CREATE POLICY "Users manage own categories" ON categories
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- TRANSACTIONS
CREATE POLICY "Users manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- GOALS
CREATE POLICY "Users manage own goals" ON goals
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- GOAL_ITEMS
CREATE POLICY "Users manage own goal items" ON goal_items
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- TIMELINE_PHASES
CREATE POLICY "Users manage own phases" ON timeline_phases
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- TIMELINE_ITEMS
CREATE POLICY "Users manage own timeline items" ON timeline_items
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- BALANCE_SNAPSHOTS
CREATE POLICY "Users manage own snapshots" ON balance_snapshots
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- ACHIEVEMENTS
CREATE POLICY "Users manage own achievements" ON achievements
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- POINT_EVENTS
CREATE POLICY "Users manage own points" ON point_events
  FOR ALL USING (auth.uid() = user_id OR is_admin());
