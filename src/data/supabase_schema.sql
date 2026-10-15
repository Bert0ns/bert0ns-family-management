-- =========================================================
-- Supabase Schema & Realtime Configuration for bert0ns
-- Supports offline-first synchronisation, RLS, and security
-- =========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Timestamp update trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- 3. Families Table
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT '€',
    invite_code VARCHAR(16) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_families_updated_at
BEFORE UPDATE ON public.families
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
    avatar_url TEXT,
    color_code VARCHAR(16) NOT NULL DEFAULT '#6366F1',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_family_members_updated_at
BEFORE UPDATE ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#6366F1',
    is_default BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Import Batches Table
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    imported_by_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    total_records INTEGER NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_import_batches_updated_at
BEFORE UPDATE ON public.import_batches
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    paid_by_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    merchant_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    payment_method TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. Push Tokens Table
CREATE TABLE IF NOT EXISTS public.push_tokens (\
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    member_id UUID PRIMARY KEY REFERENCES public.family_members(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notify_batch_import BOOLEAN NOT NULL DEFAULT TRUE,       -- A3
    notify_expense_updates BOOLEAN NOT NULL DEFAULT TRUE,     -- A4
    notify_member_joined BOOLEAN NOT NULL DEFAULT TRUE,       -- E1
    notify_role_changed BOOLEAN NOT NULL DEFAULT TRUE,        -- E2
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. In-App Notifications History Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    recipient_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    actor_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('BATCH_IMPORT', 'EXPENSE_UPDATE', 'MEMBER_JOINED', 'ROLE_CHANGED')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Row Level Security (RLS) Helper Functions & Policies
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: check if authenticated user belongs to family
CREATE OR REPLACE FUNCTION public.is_member_of_family(f_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = f_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper function: check if authenticated user is admin of family
CREATE OR REPLACE FUNCTION public.is_admin_of_family(f_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = f_id AND user_id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Families Policies
CREATE POLICY "Family members can view their family"
ON public.families FOR SELECT
USING (public.is_member_of_family(id));

CREATE POLICY "Authenticated users can create families"
ON public.families FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Family members can update family details"
ON public.families FOR UPDATE
USING (public.is_member_of_family(id));

-- Family Members Policies
CREATE POLICY "Family members can view members"
ON public.family_members FOR SELECT
USING (public.is_member_of_family(family_id) OR user_id = auth.uid());

-- Allow insert if:
-- 1. Family has NO members yet (creator inserting themselves during signup)
-- 2. OR the caller is already a confirmed member of this family
CREATE POLICY "Authorized users can insert family members"
ON public.family_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    NOT EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
    )
    OR public.is_member_of_family(family_id)
  )
);

-- Allow update if user belongs to the family, but only admins can change roles to ADMIN or modify other members
CREATE POLICY "Family members can update members"
ON public.family_members FOR UPDATE
USING (
  public.is_member_of_family(family_id) OR user_id = auth.uid()
)
WITH CHECK (
  (role <> 'ADMIN' OR public.is_admin_of_family(family_id))
  AND (user_id = auth.uid() OR public.is_admin_of_family(family_id))
);

CREATE POLICY "Admins can delete members"
ON public.family_members FOR DELETE
USING (public.is_admin_of_family(family_id));

-- Categories Policies
CREATE POLICY "Family members can view categories"
ON public.categories FOR SELECT
USING (public.is_member_of_family(family_id));

CREATE POLICY "Family members can insert categories"
ON public.categories FOR INSERT
WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Family members can update categories"
ON public.categories FOR UPDATE
USING (public.is_member_of_family(family_id));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (public.is_admin_of_family(family_id));

-- Expenses Policies
CREATE POLICY "Family members can view expenses"
ON public.expenses FOR SELECT
USING (public.is_member_of_family(family_id));

CREATE POLICY "Family members can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Family members can update expenses"
ON public.expenses FOR UPDATE
USING (public.is_member_of_family(family_id));

CREATE POLICY "Family members can delete expenses"
ON public.expenses FOR DELETE
USING (public.is_member_of_family(family_id));

-- Push Tokens Policies
CREATE POLICY "Users can manage their own push tokens"
ON public.push_tokens FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Notification Preferences Policies
CREATE POLICY "Family members can view member notification preferences"
ON public.notification_preferences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = member_id AND public.is_member_of_family(fm.family_id)
  )
);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = member_id AND fm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = member_id AND fm.user_id = auth.uid()
  )
);

-- Notifications Policies
CREATE POLICY "Members can view their own notifications"
ON public.notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = recipient_member_id AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update their own notifications"
ON public.notifications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = recipient_member_id AND fm.user_id = auth.uid()
  )
);

-- Import Batches Policies
CREATE POLICY "import_batches_family_access" ON public.import_batches
  FOR ALL USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- 12. Realtime Publication Setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.families;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Set replica identity to FULL so UPDATE/DELETE change payloads include old record values
ALTER TABLE public.families REPLICA IDENTITY FULL;
ALTER TABLE public.family_members REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.import_batches REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.notification_preferences REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 13. Secure RPC for joining a family via invite code
CREATE OR REPLACE FUNCTION public.join_family_via_invite_code(
  p_invite_code TEXT,
  p_display_name TEXT,
  p_color_code TEXT DEFAULT '#6366F1',
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_family RECORD;
  v_existing_member RECORD;
  v_new_member RECORD;
BEGIN
  -- 1. Validate invite code (case-insensitive)
  SELECT id, name, currency INTO v_family
  FROM public.families
  WHERE UPPER(invite_code) = UPPER(p_invite_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'error',
      'error', 'Invalid invite code'
    );
  END IF;

  -- 2. Check if auth user is already a member of this family
  SELECT id, display_name, role INTO v_existing_member
  FROM public.family_members
  WHERE family_id = v_family.id AND user_id = auth.uid()
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_joined',
      'family_id', v_family.id,
      'member_id', v_existing_member.id,
      'already_member', true,
      'family', jsonb_build_object('id', v_family.id, 'name', v_family.name, 'currency', v_family.currency),
      'member', jsonb_build_object('id', v_existing_member.id, 'display_name', v_existing_member.display_name, 'role', v_existing_member.role)
    );
  END IF;

  -- 3. Insert new member with MEMBER role
  INSERT INTO public.family_members (
    family_id,
    user_id,
    display_name,
    role,
    color_code,
    avatar_url
  ) VALUES (
    v_family.id,
    auth.uid(),
    p_display_name,
    'MEMBER',
    p_color_code,
    p_avatar_url
  )
  RETURNING id, display_name, role INTO v_new_member;

  -- 4. Create default notification preferences
  INSERT INTO public.notification_preferences (member_id)
  VALUES (v_new_member.id)
  ON CONFLICT (member_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'success',
    'family_id', v_family.id,
    'member_id', v_new_member.id,
    'already_member', false,
    'family', jsonb_build_object('id', v_family.id, 'name', v_family.name, 'currency', v_family.currency),
    'member', jsonb_build_object('id', v_new_member.id, 'display_name', v_new_member.display_name, 'role', v_new_member.role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 14. Supabase Database Triggers for Automated In-App Notifications

-- A3: Batch Statement Import Completed
CREATE OR REPLACE FUNCTION public.handle_import_batch_notification()
RETURNS TRIGGER AS $$
DECLARE
  uploader_name TEXT;
  rec RECORD;
BEGIN
  SELECT display_name INTO uploader_name FROM public.family_members WHERE id = NEW.imported_by_member_id;
  IF uploader_name IS NULL THEN uploader_name := 'A family member'; END IF;

  FOR rec IN
    SELECT fm.id
    FROM public.family_members fm
    LEFT JOIN public.notification_preferences np ON np.member_id = fm.id
    WHERE fm.family_id = NEW.family_id
      AND fm.id <> NEW.imported_by_member_id
      AND COALESCE(np.push_enabled, true) = true
      AND COALESCE(np.notify_batch_import, true) = true
  LOOP
    INSERT INTO public.notifications (family_id, recipient_member_id, actor_member_id, type, title, body, data)
    VALUES (
      NEW.family_id,
      rec.id,
      NEW.imported_by_member_id,
      'BATCH_IMPORT',
      'Batch Import Completed',
      uploader_name || ' imported ' || NEW.total_records || ' expenses (€' || NEW.total_amount || ') from ' || NEW.file_name,
      jsonb_build_object('batch_id', NEW.id, 'file_name', NEW.file_name, 'total_records', NEW.total_records, 'total_amount', NEW.total_amount)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_notify_import_batch ON public.import_batches;
CREATE TRIGGER tr_notify_import_batch
AFTER INSERT ON public.import_batches
FOR EACH ROW EXECUTE FUNCTION public.handle_import_batch_notification();

-- A4: Expense Edited or Deleted
CREATE OR REPLACE FUNCTION public.handle_expense_change_notification()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
  change_type TEXT;
  msg_body TEXT;
  actor_id UUID;
  fam_id UUID;
  exp_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    change_type := 'deleted';
    actor_id := OLD.paid_by_member_id;
    fam_id := OLD.family_id;
    exp_id := OLD.id;
    msg_body := 'An expense for ' || OLD.merchant_name || ' (€' || OLD.amount || ') was deleted';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if soft deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      change_type := 'deleted';
      msg_body := 'An expense for ' || NEW.merchant_name || ' (€' || NEW.amount || ') was deleted';
    ELSE
      change_type := 'updated';
      msg_body := 'An expense for ' || NEW.merchant_name || ' was updated to €' || NEW.amount;
    END IF;
    actor_id := NEW.paid_by_member_id;
    fam_id := NEW.family_id;
    exp_id := NEW.id;
  END IF;

  FOR rec IN
    SELECT fm.id
    FROM public.family_members fm
    LEFT JOIN public.notification_preferences np ON np.member_id = fm.id
    WHERE fm.family_id = fam_id
      AND fm.id <> actor_id
      AND COALESCE(np.push_enabled, true) = true
      AND COALESCE(np.notify_expense_updates, true) = true
  LOOP
    INSERT INTO public.notifications (family_id, recipient_member_id, actor_member_id, type, title, body, data)
    VALUES (
      fam_id,
      rec.id,
      actor_id,
      'EXPENSE_UPDATE',
      'Expense ' || INITCAP(change_type),
      msg_body,
      jsonb_build_object('expense_id', exp_id, 'change_type', change_type)
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_notify_expense_change ON public.expenses;
CREATE TRIGGER tr_notify_expense_change
AFTER UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_expense_change_notification();

-- E1 & E2: Member Joined and Role Changed
CREATE OR REPLACE FUNCTION public.handle_member_lifecycle_notification()
RETURNS TRIGGER AS $$
DECLARE
  fam_name TEXT;
  rec RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO fam_name FROM public.families WHERE id = NEW.family_id;
    FOR rec IN
      SELECT fm.id
      FROM public.family_members fm
      LEFT JOIN public.notification_preferences np ON np.member_id = fm.id
      WHERE fm.family_id = NEW.family_id
        AND fm.id <> NEW.id
        AND COALESCE(np.push_enabled, true) = true
        AND COALESCE(np.notify_member_joined, true) = true
    LOOP
      INSERT INTO public.notifications (family_id, recipient_member_id, actor_member_id, type, title, body, data)
      VALUES (
        NEW.family_id,
        rec.id,
        NEW.id,
        'MEMBER_JOINED',
        'New Family Member',
        NEW.display_name || ' joined ' || COALESCE(fam_name, 'the family') || '!',
        jsonb_build_object('member_id', NEW.id)
      );
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.notifications (family_id, recipient_member_id, actor_member_id, type, title, body, data)
    SELECT
      NEW.family_id,
      NEW.id,
      NULL,
      'ROLE_CHANGED',
      'Role Updated',
      'Your role has been changed to ' || NEW.role,
      jsonb_build_object('new_role', NEW.role)
    FROM public.family_members fm
    LEFT JOIN public.notification_preferences np ON np.member_id = NEW.id
    WHERE fm.id = NEW.id
      AND COALESCE(np.push_enabled, true) = true
      AND COALESCE(np.notify_role_changed, true) = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_notify_member_lifecycle ON public.family_members;
CREATE TRIGGER tr_notify_member_lifecycle
AFTER INSERT OR UPDATE OF role ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.handle_member_lifecycle_notification();

-- 15. Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user_fam ON public.family_members(user_id, family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_fam ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_deleted_at ON public.family_members(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_fam_updated ON public.expenses(family_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_fam_date ON public.expenses(family_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON public.expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_import_batch_id ON public.expenses(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_fam ON public.import_batches(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_fam_id ON public.categories(family_id);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_invite_code ON public.families(UPPER(invite_code)) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_member ON public.push_tokens(member_id);
