
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'sales_manager');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  UNIQUE (user_id, role)
);

-- 4. Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Sold', 'Under Negotiation')),
  type TEXT NOT NULL DEFAULT 'Apartment' CHECK (type IN ('Apartment', 'Villa', 'Commercial')),
  bedrooms INTEGER,
  area NUMERIC,
  description TEXT,
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  stage TEXT NOT NULL DEFAULT 'New' CHECK (stage IN ('New', 'Contacted', 'Site Visit Scheduled', 'Negotiation', 'Closed')),
  source TEXT,
  budget NUMERIC,
  property_interest TEXT,
  assigned_agent_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  property_title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Won', 'Lost')),
  expected_close DATE,
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('lead', 'property', 'deal', 'note')),
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Security definer helper function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 11. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 12. PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales managers can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 13. USER_ROLES policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 14. PROPERTIES policies
CREATE POLICY "Agents can view own properties" ON public.properties FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Admins can view all properties" ON public.properties FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales managers can view all properties" ON public.properties FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Agents can insert properties" ON public.properties FOR INSERT WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Agents can update own properties" ON public.properties FOR UPDATE USING (agent_id = auth.uid());
CREATE POLICY "Admins can manage all properties" ON public.properties FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all properties" ON public.properties FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all properties" ON public.properties FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can delete own properties" ON public.properties FOR DELETE USING (agent_id = auth.uid());

-- 15. LEADS policies
CREATE POLICY "Agents can view own leads" ON public.leads FOR SELECT USING (assigned_agent_id = auth.uid());
CREATE POLICY "Admins can view all leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales managers can view all leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Agents can insert leads" ON public.leads FOR INSERT WITH CHECK (assigned_agent_id = auth.uid());
CREATE POLICY "Admins can insert leads" ON public.leads FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can update own leads" ON public.leads FOR UPDATE USING (assigned_agent_id = auth.uid());
CREATE POLICY "Admins can update all leads" ON public.leads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can delete own leads" ON public.leads FOR DELETE USING (assigned_agent_id = auth.uid());
CREATE POLICY "Admins can delete all leads" ON public.leads FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 16. DEALS policies
CREATE POLICY "Agents can view own deals" ON public.deals FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Admins can view all deals" ON public.deals FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales managers can view all deals" ON public.deals FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Agents can insert deals" ON public.deals FOR INSERT WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Admins can insert deals" ON public.deals FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can update own deals" ON public.deals FOR UPDATE USING (agent_id = auth.uid());
CREATE POLICY "Admins can update all deals" ON public.deals FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can delete own deals" ON public.deals FOR DELETE USING (agent_id = auth.uid());
CREATE POLICY "Admins can delete all deals" ON public.deals FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 17. ACTIVITIES policies
CREATE POLICY "Users can view own activities" ON public.activities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all activities" ON public.activities FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales managers can view all activities" ON public.activities FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Users can insert activities" ON public.activities FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can insert activities" ON public.activities FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 18. Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

CREATE POLICY "Anyone can view property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "Authenticated users can upload property images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own property images" ON storage.objects FOR UPDATE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own property images" ON storage.objects FOR DELETE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 19. Indexes for performance
CREATE INDEX idx_properties_agent_id ON public.properties(agent_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_leads_assigned_agent_id ON public.leads(assigned_agent_id);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_deals_agent_id ON public.deals(agent_id);
CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
