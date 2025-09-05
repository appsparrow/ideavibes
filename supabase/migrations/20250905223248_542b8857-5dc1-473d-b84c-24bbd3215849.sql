-- Create enums for type safety
CREATE TYPE public.user_role AS ENUM ('member', 'admin');
CREATE TYPE public.investor_type AS ENUM ('active', 'passive', 'strategic');
CREATE TYPE public.idea_sector AS ENUM ('healthcare', 'real_estate', 'other');
CREATE TYPE public.idea_status AS ENUM ('proposed', 'under_review', 'validated', 'investment_ready');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'done');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'member',
  investor_type investor_type DEFAULT 'passive',
  profile TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ideas table
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sector idea_sector DEFAULT 'other',
  status idea_status DEFAULT 'proposed',
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ai_summary TEXT,
  ai_opportunity_eval JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evaluations table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  market_size INTEGER CHECK (market_size >= 1 AND market_size <= 5),
  feasibility INTEGER CHECK (feasibility >= 1 AND feasibility <= 5),
  strategic_fit INTEGER CHECK (strategic_fit >= 1 AND strategic_fit <= 5),
  novelty INTEGER CHECK (novelty >= 1 AND novelty <= 5),
  ai_suggestion JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

-- Create investor interest table
CREATE TABLE public.investor_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  interest_type investor_type NOT NULL,
  amount_commitment DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status task_status DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  agenda TEXT,
  notes TEXT,
  ideas_discussed JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for ideas
CREATE POLICY "Anyone can view ideas" ON public.ideas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create ideas" ON public.ideas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own ideas" ON public.ideas FOR UPDATE USING (auth.uid() = submitted_by);

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for evaluations
CREATE POLICY "Anyone can view evaluations" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create evaluations" ON public.evaluations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own evaluations" ON public.evaluations FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for votes
CREATE POLICY "Anyone can view votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create votes" ON public.votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own votes" ON public.votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for investor interest
CREATE POLICY "Anyone can view investor interest" ON public.investor_interest FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create investor interest" ON public.investor_interest FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own investor interest" ON public.investor_interest FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Assigned users can update tasks" ON public.tasks FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() IN (SELECT submitted_by FROM public.ideas WHERE id = idea_id));

-- RLS Policies for meetings
CREATE POLICY "Anyone can view meetings" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create meetings" ON public.meetings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update meetings" ON public.meetings FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ideas updated_at
CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();