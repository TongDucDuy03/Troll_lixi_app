-- Supabase Database Schema for Multi-User Lì Xì App

-- 1. User Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Game States Table
CREATE TABLE IF NOT EXISTS user_game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_inventories JSONB NOT NULL DEFAULT '{}',
  rigging_config JSONB NOT NULL DEFAULT '{"next_spin_mode": "random", "target_value": null, "fake_value": null}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Spin History Table
CREATE TABLE IF NOT EXISTS spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  user_name TEXT NOT NULL,
  role_id TEXT NOT NULL,
  display_value INTEGER NOT NULL,
  real_value INTEGER NOT NULL,
  scenario_used TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_game_states
CREATE POLICY "Users can view their own game state"
  ON user_game_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own game state"
  ON user_game_states FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game state"
  ON user_game_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for spin_history
CREATE POLICY "Users can view their own spin history"
  ON spin_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spin history"
  ON spin_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_game_states_user_id ON user_game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_user_id ON spin_history(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_timestamp ON spin_history(timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_game_states_updated_at BEFORE UPDATE ON user_game_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
