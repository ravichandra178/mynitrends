
-- Create trends table
CREATE TABLE public.trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID REFERENCES public.trends(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  posted BOOLEAN NOT NULL DEFAULT false,
  facebook_post_id TEXT,
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table (single row)
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  openai_api_key TEXT DEFAULT '',
  facebook_page_id TEXT DEFAULT '',
  facebook_page_access_token TEXT DEFAULT '',
  auto_post_enabled BOOLEAN NOT NULL DEFAULT false,
  max_posts_per_day INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.settings (id) VALUES (gen_random_uuid());

-- Enable RLS on all tables
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Permissive policies (single-user admin app, no auth required)
CREATE POLICY "Allow all on trends" ON public.trends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);
CREATE POLICY "Public read post images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Allow upload post images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images');
CREATE POLICY "Allow delete post images" ON storage.objects FOR DELETE USING (bucket_id = 'post-images');

-- Updated_at trigger for settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
