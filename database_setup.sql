-- Connect 5 Daily Puzzle Database Schema
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_daily_games INTEGER DEFAULT 0,
  total_practice_games INTEGER DEFAULT 0,
  total_score_sum INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  leaderboard_appearances INTEGER DEFAULT 0
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profiles view for leaderboards (username and stats only)
CREATE POLICY "Anyone can view public profile data" ON profiles
  FOR SELECT USING (true);

-- Daily puzzles table
CREATE TABLE IF NOT EXISTS daily_puzzles (
  date DATE PRIMARY KEY,
  puzzle_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on daily_puzzles
ALTER TABLE daily_puzzles ENABLE ROW LEVEL SECURITY;

-- RLS Policy for daily_puzzles (everyone can read)
CREATE POLICY "Anyone can view daily puzzles" ON daily_puzzles
  FOR SELECT USING (true);

-- Daily game attempts
CREATE TABLE IF NOT EXISTS daily_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  puzzle_date DATE REFERENCES daily_puzzles(date) NOT NULL,
  score INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  turns_used INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, puzzle_date)
);

-- Enable RLS on daily_attempts
ALTER TABLE daily_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_attempts
CREATE POLICY "Users can view their own attempts" ON daily_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts" ON daily_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON daily_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Public view for leaderboards (no user_id exposure)
CREATE POLICY "Anyone can view completed attempts for leaderboards" ON daily_attempts
  FOR SELECT USING (completed = true);

-- Practice game records
CREATE TABLE IF NOT EXISTS practice_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  turns_used INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on practice_games
ALTER TABLE practice_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_games
CREATE POLICY "Users can view their own practice games" ON practice_games
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice games" ON practice_games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily leaderboard snapshots (frozen at day end)
CREATE TABLE IF NOT EXISTS daily_leaderboard_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  puzzle_date DATE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  snapshot_taken_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_leaderboard_snapshots_puzzle_date_user_id_key
  ON daily_leaderboard_snapshots (puzzle_date, user_id);

-- Enable RLS on daily_leaderboard_snapshots
ALTER TABLE daily_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy for daily_leaderboard_snapshots (everyone can read)
CREATE POLICY "Anyone can view leaderboard snapshots" ON daily_leaderboard_snapshots
  FOR SELECT USING (true);

-- Function to handle user signup and create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate daily puzzle configuration
CREATE OR REPLACE FUNCTION generate_puzzle_config(puzzle_date DATE)
RETURNS JSONB AS $$
DECLARE
  seed INTEGER;
  letters TEXT[] := ARRAY['A','A','E','E','I','I','O','O','U','U','R','R','L','L','L','N','N','N','S','S','T','T','D','D','G','G','B','B','C','C','M','M','P','P','F','F','H','H','V','V','W','W','Y','Y','K','J','X','Q','Z'];
  positions JSONB := '[]'::JSONB;
  i INTEGER;
  row_val INTEGER;
  col_val INTEGER;
  letter TEXT;
  position JSONB;
BEGIN
  -- Use date as seed for consistent daily puzzles
  seed := EXTRACT(EPOCH FROM puzzle_date)::INTEGER;

  -- Set seed for reproducible random generation
  PERFORM setseed((seed % 32767) / 32767.0);

  -- Generate 5 starting positions
  FOR i IN 1..5 LOOP
    LOOP
      row_val := floor(random() * 10)::INTEGER;
      col_val := floor(random() * 10)::INTEGER;

      -- Check if position is at least 2 spaces away from existing positions
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(positions) AS pos
        WHERE ABS((pos->>'row')::INTEGER - row_val) <= 1
        AND ABS((pos->>'col')::INTEGER - col_val) <= 1
      ) THEN
        EXIT;
      END IF;
    END LOOP;

    -- Select random letter
    letter := letters[floor(random() * array_length(letters, 1)) + 1];

    -- Add position to array
    position := jsonb_build_object('row', row_val, 'col', col_val, 'letter', letter);
    positions := positions || position;
  END LOOP;

  RETURN jsonb_build_object('startTiles', positions);
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily puzzle (called by cron or manually)
CREATE OR REPLACE FUNCTION ensure_daily_puzzle(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_puzzles (date, puzzle_config)
  VALUES (target_date, generate_puzzle_config(target_date))
  ON CONFLICT (date) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create daily leaderboard snapshot
CREATE OR REPLACE FUNCTION create_daily_snapshot(target_date DATE)
RETURNS void AS $$
BEGIN
  WITH inserted_rows AS (
    INSERT INTO daily_leaderboard_snapshots
      (puzzle_date, user_id, username, score, rank, completed_at)
    SELECT
      target_date,
      da.user_id,
      p.username,
      da.score,
      ROW_NUMBER() OVER (ORDER BY da.score DESC, da.completed_at ASC),
      da.completed_at
    FROM daily_attempts da
    JOIN profiles p ON da.user_id = p.id
    WHERE da.puzzle_date = target_date
      AND da.completed = true
    ORDER BY da.score DESC, da.completed_at ASC
    LIMIT 10
    ON CONFLICT (puzzle_date, user_id) DO NOTHING
    RETURNING user_id
  )
  UPDATE profiles
  SET leaderboard_appearances = leaderboard_appearances + 1
  WHERE id IN (SELECT user_id FROM inserted_rows);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate today's puzzle
SELECT ensure_daily_puzzle();

-- Optional: schedule ongoing maintenance with pg_cron in Supabase.
-- Run these manually after enabling the pg_cron extension in your project.
--
-- Create tomorrow's puzzle every day at 00:05 UTC:
-- SELECT cron.schedule(
--   'connect5-create-next-daily-puzzle',
--   '5 0 * * *',
--   $$SELECT ensure_daily_puzzle((CURRENT_DATE + INTERVAL '1 day')::DATE);$$
-- );
--
-- Freeze yesterday's leaderboard every day at 00:10 UTC:
-- SELECT cron.schedule(
--   'connect5-freeze-yesterday-leaderboard',
--   '10 0 * * *',
--   $$SELECT create_daily_snapshot((CURRENT_DATE - INTERVAL '1 day')::DATE);$$
-- );
