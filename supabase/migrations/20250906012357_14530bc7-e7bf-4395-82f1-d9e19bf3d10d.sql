-- Fix RLS policies for profiles table - only allow users to view their own profile
-- and allow admins/moderators to view all profiles for management purposes
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins and moderators can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_moderator(auth.uid()));

-- Fix RLS policies for investor_interest table - only allow users to view their own data
-- and allow admins/moderators to view all for management purposes
DROP POLICY IF EXISTS "Anyone can view investor interest" ON public.investor_interest;

CREATE POLICY "Users can view own investor interest" 
ON public.investor_interest 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can view all investor interest" 
ON public.investor_interest 
FOR SELECT 
USING (is_moderator(auth.uid()));

-- Ensure the profiles table has proper trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'member'::user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();