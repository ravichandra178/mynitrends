-- Neon PostgreSQL Database Schema
-- Run this in Neon console to set up your database

-- Create trends table
CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  source TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID REFERENCES trends(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  posted BOOLEAN DEFAULT FALSE,
  facebook_post_id TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  engagement_likes INT DEFAULT 0,
  engagement_comments INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_post_enabled BOOLEAN DEFAULT FALSE,
  max_posts_per_day INT DEFAULT 3,
  openai_api_key TEXT,
  facebook_page_id TEXT,
  facebook_page_access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trends_created_at ON trends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_used ON trends(used);
CREATE INDEX IF NOT EXISTS idx_posts_trend_id ON posts(trend_id);
CREATE INDEX IF NOT EXISTS idx_posts_posted ON posts(posted);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_time ON posts(scheduled_time);

-- Insert default settings row
INSERT INTO settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
