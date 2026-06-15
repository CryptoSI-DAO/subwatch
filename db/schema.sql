-- SubWatch tables

-- subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    billing_cycle TEXT DEFAULT 'monthly',
    cycle_days INTEGER DEFAULT 30,
    category_id TEXT,
    icon TEXT,
    color TEXT,
    next_billing_date DATE,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- price_history table
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
    old_price NUMERIC(10,2),
    new_price NUMERIC(10,2) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies (users can only see their own data)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can CRUD own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read own price history" ON public.price_history;
DROP POLICY IF EXISTS "Users can insert own price history" ON public.price_history;

-- Subscriptions: full CRUD for owner
CREATE POLICY "Users can CRUD own subscriptions" ON public.subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Price history: read + insert for subscription owners
CREATE POLICY "Users can read own price history" ON public.price_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid())
    );

CREATE POLICY "Users can insert own price history" ON public.price_history
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid())
    );

-- Grant access
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.price_history TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
