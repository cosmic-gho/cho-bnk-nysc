-- ============================================================================
-- INVESTMENT MODULE TABLES AND POLICIES
-- Supports:
-- 1. Fixed-Yield / Term Deposit & Staking Plans (investment_plans, user_investments)
-- 2. Stocks & Crypto Live Asset Portfolio (asset_holdings, asset_orders)
-- ============================================================================

-- 1. Investment Plans Table (Admin managed plans that users can invest in)
CREATE TABLE IF NOT EXISTS investment_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'fixed_deposit' CHECK (
    category IN ('fixed_deposit', 'crypto_staking', 'mutual_fund', 'real_estate', 'bonds')
  ),
  min_amount DECIMAL(15, 2) NOT NULL DEFAULT 100.00,
  max_amount DECIMAL(15, 2) NOT NULL DEFAULT 500000.00,
  interest_rate DECIMAL(6, 2) NOT NULL, -- APY in percentage, e.g. 8.50%
  duration_days INTEGER NOT NULL,       -- Lockup term in days e.g. 30, 90, 180, 365
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (
    risk_level IN ('low', 'moderate', 'high')
  ),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. User Investments Table (Active & completed term investments)
CREATE TABLE IF NOT EXISTS user_investments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES investment_plans(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  expected_return DECIMAL(15, 2) NOT NULL,
  total_payout DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'matured', 'claimed', 'cancelled')
  ),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Asset Holdings Table (Stocks & Crypto fractional portfolio positions)
CREATE TABLE IF NOT EXISTS asset_holdings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  asset_symbol VARCHAR(12) NOT NULL,
  asset_name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
  average_buy_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_invested DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_asset UNIQUE(user_id, asset_symbol)
);

-- 4. Asset Orders Table (Buy/Sell logs)
CREATE TABLE IF NOT EXISTS asset_orders (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  asset_symbol VARCHAR(12) NOT NULL,
  asset_name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),
  quantity DECIMAL(18, 8) NOT NULL,
  price_per_unit DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_orders ENABLE ROW LEVEL SECURITY;

-- Investment Plans Policies
DROP POLICY IF EXISTS "Anyone can view active investment plans" ON investment_plans;
CREATE POLICY "Anyone can view active investment plans"
  ON investment_plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage investment plans" ON investment_plans;
CREATE POLICY "Admins can manage investment plans"
  ON investment_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- User Investments Policies
DROP POLICY IF EXISTS "Users can view their own investments" ON user_investments;
CREATE POLICY "Users can view their own investments"
  ON user_investments FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can create investments" ON user_investments;
CREATE POLICY "Users can create investments"
  ON user_investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their investments" ON user_investments;
CREATE POLICY "Users can update their investments"
  ON user_investments FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Asset Holdings Policies
DROP POLICY IF EXISTS "Users can view their own asset holdings" ON asset_holdings;
CREATE POLICY "Users can view their own asset holdings"
  ON asset_holdings FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can manage their asset holdings" ON asset_holdings;
CREATE POLICY "Users can manage their asset holdings"
  ON asset_holdings FOR ALL
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Asset Orders Policies
DROP POLICY IF EXISTS "Users can view their own orders" ON asset_orders;
CREATE POLICY "Users can view their own orders"
  ON asset_orders FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can insert their orders" ON asset_orders;
CREATE POLICY "Users can insert their orders"
  ON asset_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SEED INITIAL INVESTMENT PLANS
-- ============================================================================

INSERT INTO investment_plans (name, description, category, min_amount, max_amount, interest_rate, duration_days, risk_level, is_active)
VALUES
  ('Starter Savings Certificate', 'Low-risk insured term deposit designed for consistent short-term capital preservation.', 'fixed_deposit', 100.00, 25000.00, 5.20, 30, 'low', true),
  ('High-Yield Treasury Vault', 'Backed by sovereign treasury bonds offering stable, predictable returns over 90 days.', 'bonds', 500.00, 100000.00, 8.40, 90, 'low', true),
  ('Real Estate Alpha Income', 'Secured commercial and residential development financing with high seasonal dividend yields.', 'real_estate', 1000.00, 250000.00, 12.80, 180, 'moderate', true),
  ('Blue-Chip Crypto Staking', 'Institutional validator node staking pool for Tier 1 networks (ETH/SOL) with compounded yield.', 'crypto_staking', 250.00, 50000.00, 16.50, 90, 'moderate', true),
  ('Global Tech Disruptors Fund', 'Curated index fund tracking high-growth cloud computing, AI, and green energy market leaders.', 'mutual_fund', 1500.00, 300000.00, 18.20, 180, 'high', true),
  ('Quantitative Growth Alpha', 'Algorithmic multi-asset strategy capitalizing on automated arbitrage and trend execution.', 'mutual_fund', 2000.00, 500000.00, 24.00, 365, 'high', true)
ON CONFLICT DO NOTHING;
