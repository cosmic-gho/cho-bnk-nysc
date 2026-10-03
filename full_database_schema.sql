-- Full Supabase Database Schema for Banking App (BNK Finance Bank)
-- Run this in your Supabase SQL Editor to set up or update the full database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Lookup Tables
CREATE TABLE IF NOT EXISTS account_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crypto_wallets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  network VARCHAR(50),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(150) UNIQUE,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  address TEXT,
  date_of_birth DATE,
  profile_picture TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  can_transfer BOOLEAN DEFAULT TRUE,
  transfer_pin TEXT,
  transfer_pin_2 TEXT,
  login_otp_code VARCHAR(10),
  login_otp_expires TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Accounts Table (References auth.users and user_profiles)
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type_id INTEGER NOT NULL REFERENCES account_types(id),
  account_number VARCHAR(50) NOT NULL UNIQUE,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  transaction_limit DECIMAL(15, 2) DEFAULT 500000.00,
  daily_limit DECIMAL(15, 2) DEFAULT 10000.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT accounts_user_id_user_profiles_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'wire_transfer', 'local_transfer')),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES transaction_categories(id) ON DELETE SET NULL,
  recipient_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'approved',
  verification_step INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Deposit Requests Table
CREATE TABLE IF NOT EXISTS deposit_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  crypto_wallet_id INTEGER NOT NULL REFERENCES crypto_wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  crypto_symbol VARCHAR(20) NOT NULL,
  transaction_hash TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Card Requests Table
CREATE TABLE IF NOT EXISTS card_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('virtual', 'physical')),
  card_tier VARCHAR(20) CHECK (card_tier IN ('standard', 'gold', 'platinum')),
  card_number VARCHAR(20),
  expiry_month VARCHAR(2),
  expiry_year VARCHAR(4),
  cvv VARCHAR(4),
  card_holder_name VARCHAR(150),
  daily_limit DECIMAL(15, 2) DEFAULT 1000.00,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. KYC Submissions Table
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ssn VARCHAR(20),
  id_card_front_url TEXT NOT NULL,
  id_card_back_url TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'United States',
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  rejection_reason TEXT,
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Helper Function to check admin status (bypasses RLS to prevent infinite recursion)
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO authenticated;

-- RLS Policies for User Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
CREATE POLICY "Admins can view all user profiles" ON user_profiles FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all user profiles" ON user_profiles;
CREATE POLICY "Admins can update all user profiles" ON user_profiles FOR UPDATE USING (is_user_admin(auth.uid()));

-- RLS Policies for Accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
CREATE POLICY "Users can view their own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
CREATE POLICY "Users can insert their own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
CREATE POLICY "Users can update their own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all accounts" ON accounts;
CREATE POLICY "Admins can view all accounts" ON accounts FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all accounts" ON accounts;
CREATE POLICY "Admins can update all accounts" ON accounts FOR UPDATE USING (is_user_admin(auth.uid()));

-- RLS Policies for Transactions
DROP POLICY IF EXISTS "Users can view transactions for their accounts" ON transactions;
CREATE POLICY "Users can view transactions for their accounts" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM accounts WHERE accounts.id = transactions.account_id AND accounts.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM accounts WHERE accounts.id = transactions.recipient_account_id AND accounts.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert transactions for their accounts" ON transactions;
CREATE POLICY "Users can insert transactions for their accounts" ON transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM accounts WHERE accounts.id = transactions.account_id AND accounts.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;
CREATE POLICY "Admins can insert transactions" ON transactions FOR INSERT WITH CHECK (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
CREATE POLICY "Admins can update transactions" ON transactions FOR UPDATE USING (is_user_admin(auth.uid()));

-- RLS Policies for Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications" ON notifications FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications" ON notifications FOR INSERT WITH CHECK (is_user_admin(auth.uid()));

-- RLS Policies for Crypto Wallets
DROP POLICY IF EXISTS "Anyone can view active crypto wallets" ON crypto_wallets;
CREATE POLICY "Anyone can view active crypto wallets" ON crypto_wallets FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can view all crypto wallets" ON crypto_wallets;
CREATE POLICY "Admins can view all crypto wallets" ON crypto_wallets FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create crypto wallets" ON crypto_wallets;
CREATE POLICY "Admins can create crypto wallets" ON crypto_wallets FOR INSERT WITH CHECK (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update crypto wallets" ON crypto_wallets;
CREATE POLICY "Admins can update crypto wallets" ON crypto_wallets FOR UPDATE USING (is_user_admin(auth.uid()));

-- RLS Policies for Deposit Requests
DROP POLICY IF EXISTS "Users can view their own deposit requests" ON deposit_requests;
CREATE POLICY "Users can view their own deposit requests" ON deposit_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own deposit requests" ON deposit_requests;
CREATE POLICY "Users can insert their own deposit requests" ON deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all deposit requests" ON deposit_requests;
CREATE POLICY "Admins can view all deposit requests" ON deposit_requests FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all deposit requests" ON deposit_requests;
CREATE POLICY "Admins can update all deposit requests" ON deposit_requests FOR UPDATE USING (is_user_admin(auth.uid()));

-- RLS Policies for Card Requests
DROP POLICY IF EXISTS "Users can view their own card requests" ON card_requests;
CREATE POLICY "Users can view their own card requests" ON card_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own card requests" ON card_requests;
CREATE POLICY "Users can insert their own card requests" ON card_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all card requests" ON card_requests;
CREATE POLICY "Admins can view all card requests" ON card_requests FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all card requests" ON card_requests;
CREATE POLICY "Admins can update all card requests" ON card_requests FOR UPDATE USING (is_user_admin(auth.uid()));

-- RLS Policies for KYC Submissions
DROP POLICY IF EXISTS "Users can view their own KYC submissions" ON kyc_submissions;
CREATE POLICY "Users can view their own KYC submissions" ON kyc_submissions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own KYC submissions" ON kyc_submissions;
CREATE POLICY "Users can insert their own KYC submissions" ON kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all KYC submissions" ON kyc_submissions;
CREATE POLICY "Admins can view all KYC submissions" ON kyc_submissions FOR SELECT USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all KYC submissions" ON kyc_submissions;
CREATE POLICY "Admins can update all KYC submissions" ON kyc_submissions FOR UPDATE USING (is_user_admin(auth.uid()));

-- Updated_At Timestamp Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at Triggers
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_wallets_updated_at ON crypto_wallets;
CREATE TRIGGER update_crypto_wallets_updated_at BEFORE UPDATE ON crypto_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deposit_requests_updated_at ON deposit_requests;
CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON deposit_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_card_requests_updated_at ON card_requests;
CREATE TRIGGER update_card_requests_updated_at BEFORE UPDATE ON card_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kyc_submissions_updated_at ON kyc_submissions;
CREATE TRIGGER update_kyc_submissions_updated_at BEFORE UPDATE ON kyc_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Signup Trigger (Automatically creates user_profile and primary Savings account)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  savings_account_type_id INTEGER;
  account_number_value VARCHAR(50);
  max_attempts INTEGER := 20;
  attempt_count INTEGER := 0;
BEGIN
  -- Create user profile first
  BEGIN
    INSERT INTO user_profiles (id, username, email, first_name, last_name, is_admin)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', NULL),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
      COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
      FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(user_profiles.first_name, EXCLUDED.first_name),
      last_name = COALESCE(user_profiles.last_name, EXCLUDED.last_name);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  END;

  -- Get the Savings account type ID
  BEGIN
    SELECT id INTO savings_account_type_id FROM account_types WHERE name = 'Savings' LIMIT 1;
    IF savings_account_type_id IS NULL THEN
      SELECT id INTO savings_account_type_id FROM account_types LIMIT 1;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error getting account type: %', SQLERRM;
      RETURN NEW;
  END;

  IF savings_account_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Generate unique account number
  LOOP
    account_number_value := 'SAV-' || 
      TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
      LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000)::TEXT, 6, '0') || '-' ||
      LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = account_number_value) THEN
      EXIT;
    END IF;
    
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      account_number_value := 'SAV-' || 
        REPLACE(SUBSTRING(NEW.id::TEXT, 1, 8), '-', '') || '-' ||
        TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT % 100000, 'FM00000');
      EXIT;
    END IF;
  END LOOP;

  -- Create default savings account
  BEGIN
    INSERT INTO accounts (user_id, account_type_id, account_number, balance, is_active)
    VALUES (NEW.id, savings_account_type_id, account_number_value, 0.00, TRUE)
    ON CONFLICT (account_number) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Account creation failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Seed Default Data
INSERT INTO account_types (name, description) VALUES
  ('Checking', 'Standard checking account'),
  ('Savings', 'Savings account with interest'),
  ('Business', 'Business account')
ON CONFLICT (name) DO NOTHING;

INSERT INTO transaction_categories (name, description) VALUES
  ('Food & Dining', 'Restaurants, groceries, food delivery'),
  ('Transportation', 'Gas, public transport, rideshare'),
  ('Shopping', 'Retail purchases, online shopping'),
  ('Bills & Utilities', 'Rent, utilities, subscriptions'),
  ('Entertainment', 'Movies, games, events'),
  ('Healthcare', 'Medical expenses, pharmacy'),
  ('Income', 'Salary, freelance, refunds')
ON CONFLICT (name) DO NOTHING;

INSERT INTO crypto_wallets (name, symbol, wallet_address, network, display_order) VALUES
  ('Bitcoin', 'BTC', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Bitcoin Network', 1),
  ('Ethereum', 'ETH', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'ERC20', 2),
  ('Tether', 'USDT', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'ERC20', 3)
ON CONFLICT DO NOTHING;

-- Safe Upgrade Alterations for Existing Databases
DO $$
BEGIN
  -- User profiles columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'email') THEN
    ALTER TABLE user_profiles ADD COLUMN email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'transfer_pin_2') THEN
    ALTER TABLE user_profiles ADD COLUMN transfer_pin_2 VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'can_transfer') THEN
    ALTER TABLE user_profiles ADD COLUMN can_transfer BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'currency') THEN
    ALTER TABLE user_profiles ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'login_otp_code') THEN
    ALTER TABLE user_profiles ADD COLUMN login_otp_code VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'login_otp_expires') THEN
    ALTER TABLE user_profiles ADD COLUMN login_otp_expires TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Accounts limits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'transaction_limit') THEN
    ALTER TABLE accounts ADD COLUMN transaction_limit DECIMAL(15, 2) DEFAULT 500000.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'daily_limit') THEN
    ALTER TABLE accounts ADD COLUMN daily_limit DECIMAL(15, 2) DEFAULT 10000.00;
  END IF;

  -- Foreign key constraint for accounts -> user_profiles (enables PostgREST relational joins)
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'accounts_user_id_user_profiles_fkey') THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_user_profiles_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;
