-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_billing (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_type text DEFAULT 'individual',
  full_name text,
  tc_no text,
  company_name text,
  tax_office text,
  tax_no text,
  city text,
  district text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own addresses" ON user_addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own billing" ON user_billing
  FOR ALL USING (auth.uid() = user_id);
