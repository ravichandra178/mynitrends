
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow all on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all on trends" ON public.trends;

-- Create permissive policies (default is PERMISSIVE)
CREATE POLICY "Allow all on posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on trends" ON public.trends FOR ALL USING (true) WITH CHECK (true);
