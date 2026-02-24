-- Run this script in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'student',
    readiness_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We link our public.users table to Supabase's auth.users table.
-- You should create a Trigger to sync new signups:
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.users (id, email, full_name)
--   VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
--   RETURN new;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Interview Attempts table
CREATE TABLE IF NOT EXISTS public.interview_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    score INTEGER,
    feedback JSONB,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Coding Attempts table
CREATE TABLE IF NOT EXISTS public.coding_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    problem_slug TEXT,
    language TEXT,
    submitted_code TEXT,
    success BOOLEAN,
    execution_time_ms INTEGER,
    ai_feedback JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Doubts table
CREATE TABLE IF NOT EXISTS public.doubts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    ai_answer TEXT,
    context_tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Weak Topics table
CREATE TABLE IF NOT EXISTS public.weak_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    weakness_score FLOAT,
    last_identified TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weak_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own interview attempts" ON public.interview_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interview attempts" ON public.interview_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own coding attempts" ON public.coding_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own coding attempts" ON public.coding_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own doubts" ON public.doubts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own doubts" ON public.doubts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own weak topics" ON public.weak_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weak topics" ON public.weak_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
