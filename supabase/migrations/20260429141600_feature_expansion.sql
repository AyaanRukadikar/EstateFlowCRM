-- ============================================================
-- EstateFlow CRM — Feature Expansion Migration
-- ============================================================

-- ── 1. Notes table ──────────────────────────────────────────
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'property', 'deal')),
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_notes_entity ON public.notes(entity_type, entity_id);
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_created_at ON public.notes(created_at DESC);

-- ── 2. Property images column ───────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- ── 3. Organizations (multi-tenant) ─────────────────────────
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);

-- Add org_id to entity tables (nullable for backwards compat)
ALTER TABLE public.properties   ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.leads        ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.deals        ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.activities   ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.notes        ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX idx_properties_org_id ON public.properties(org_id);
CREATE INDEX idx_leads_org_id ON public.leads(org_id);
CREATE INDEX idx_deals_org_id ON public.deals(org_id);

-- Auto-create default organization on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _org_id UUID;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');

  -- Create a personal org and make the user its owner
  INSERT INTO public.organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Org',
    NEW.id::text
  )
  RETURNING id INTO _org_id;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 4. RLS for notes ────────────────────────────────────────
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"    ON public.notes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all notes"   ON public.notes FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view all notes" ON public.notes FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Users can insert notes"      ON public.notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notes"  ON public.notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notes"  ON public.notes FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can delete any note"  ON public.notes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ── 5. RLS for organizations ────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT
  USING (id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Owners can update their org" ON public.organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "Members can view memberships" ON public.org_members FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY "Owners can manage members" ON public.org_members FOR ALL
  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ── 6. Sales Manager write policies (gap fix) ───────────────
CREATE POLICY "Sales managers can insert leads"     ON public.leads     FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can update all leads"  ON public.leads     FOR UPDATE USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can delete leads"      ON public.leads     FOR DELETE USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can insert properties" ON public.properties FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can update properties" ON public.properties FOR UPDATE USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can delete properties" ON public.properties FOR DELETE USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can insert deals"      ON public.deals     FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can update deals"      ON public.deals     FOR UPDATE USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can delete deals"      ON public.deals     FOR DELETE USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales managers can insert activities" ON public.activities FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'sales_manager'));

-- ── 7. Auto activity logging triggers ───────────────────────
CREATE OR REPLACE FUNCTION public.log_property_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activities (type, message, related_entity_type, related_entity_id, user_id, org_id)
  VALUES ('property',
    CASE TG_OP
      WHEN 'INSERT' THEN 'Property "' || NEW.title || '" was created'
      WHEN 'UPDATE' THEN 'Property "' || NEW.title || '" was updated'
      WHEN 'DELETE' THEN 'Property "' || OLD.title || '" was deleted'
    END,
    'property',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.agent_id, OLD.agent_id),
    COALESCE(NEW.org_id, OLD.org_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_property_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.log_property_activity();

CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activities (type, message, related_entity_type, related_entity_id, user_id, org_id)
  VALUES ('lead',
    CASE TG_OP
      WHEN 'INSERT' THEN 'Lead "' || NEW.name || '" was created'
      WHEN 'UPDATE' THEN
        CASE
          WHEN OLD.stage IS DISTINCT FROM NEW.stage
            THEN 'Lead "' || NEW.name || '" moved to ' || NEW.stage
          WHEN OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id
            THEN 'Lead "' || NEW.name || '" was reassigned'
          ELSE 'Lead "' || NEW.name || '" was updated'
        END
      WHEN 'DELETE' THEN 'Lead "' || OLD.name || '" was deleted'
    END,
    'lead',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.assigned_agent_id, OLD.assigned_agent_id),
    COALESCE(NEW.org_id, OLD.org_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_lead_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_activity();

CREATE OR REPLACE FUNCTION public.log_deal_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activities (type, message, related_entity_type, related_entity_id, user_id, org_id)
  VALUES ('deal',
    CASE TG_OP
      WHEN 'INSERT' THEN 'Deal for "' || NEW.lead_name || '" was created'
      WHEN 'UPDATE' THEN
        CASE
          WHEN OLD.status IS DISTINCT FROM NEW.status
            THEN 'Deal for "' || NEW.lead_name || '" changed to ' || NEW.status
          ELSE 'Deal for "' || NEW.lead_name || '" was updated'
        END
      WHEN 'DELETE' THEN 'Deal for "' || OLD.lead_name || '" was deleted'
    END,
    'deal',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.agent_id, OLD.agent_id),
    COALESCE(NEW.org_id, OLD.org_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_deal_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.log_deal_activity();

-- ── 8. Realtime for notes ───────────────────────────────────
ALTER TABLE public.notes REPLICA IDENTITY FULL;
