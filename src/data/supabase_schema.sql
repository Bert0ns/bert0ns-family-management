-- 👨‍👩‍👧‍👦 Family Expense Management App — Supabase Schema & Realtime Setup
-- Fully compatible with Supabase Free Tier ($0 cost)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Timestamp update trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Families Table
CREATE TABLE IF NOT EXISTS public.families (\n    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT '€',
    invite_code VARCHAR(12) UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
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
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')) DEFAULT 'MEMBER',
    avatar_url TEXT,
    color_code TEXT NOT NULL DEFAULT '#4F46E5',
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(12, 2) NOT NULL,
    period TEXT NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (family_id, category_id, period)
);

CREATE TRIGGER set_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Import Batches Table
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

-- 8. Expenses Table
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Expense Splits Table
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    share_amount NUMERIC(12, 2) NOT NULL,
    percentage NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_expense_splits_updated_at
BEFORE UPDATE ON public.expense_splits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    to_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Push Tokens Table
CREATE TABLE IF NOT EXISTS public.push_tokens (
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

-- 12. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    member_id UUID PRIMARY KEY REFERENCES public.family_members(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notify_batch_import BOOLEAN NOT NULL DEFAULT TRUE,       -- A3
    notify_expense_updates BOOLEAN NOT NULL DEFAULT TRUE,     -- A4
    notify_settlements BOOLEAN NOT NULL DEFAULT TRUE,         -- B1
    notify_member_joined BOOLEAN NOT NULL DEFAULT TRUE,       -- E1
    notify_role_changed BOOLEAN NOT NULL DEFAULT TRUE,        -- E2
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 13. In-App Notifications History Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    recipient_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    actor_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('BATCH_IMPORT', 'EXPENSE_UPDATE', 'SETTLEMENT', 'MEMBER_JOINED', 'ROLE_CHANGED')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Row Level Security (RLS) Helper Functions & Policies
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
USING (public.is_member_of_family(family_id));

CREATE POLICY "Authenticated users can join or add family members"
ON public.family_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Family members can update members"
ON public.family_members FOR UPDATE
USING (public.is_member_of_family(family_id));

CREATE POLICY "Family members can delete members"
ON public.family_members FOR DELETE
USING (public.is_member_of_family(family_id));

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

CREATE POLICY "Family members can delete categories"
ON public.categories FOR DELETE
USING (public.is_member_of_family(family_id));

-- Expenses Policies
CREATE POLICY "Family members can view family expenses"
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

-- Expense Splits Policies
CREATE POLICY "Family members can view splits"
ON public.expense_splits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND public.is_member_of_family(e.family_id)
  )
);

CREATE POLICY "Family members can insert splits"
ON public.expense_splits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND public.is_member_of_family(e.family_id)
  )
);

CREATE POLICY "Family members can update splits"
ON public.expense_splits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND public.is_member_of_family(e.family_id)
  )
);

CREATE POLICY "Family members can delete splits"
ON public.expense_splits FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND public.is_member_of_family(e.family_id)
  )
);

-- Settlements Policies
CREATE POLICY "Family members can view settlements"
ON public.settlements FOR SELECT
USING (public.is_member_of_family(family_id));

CREATE POLICY "Family members can insert settlements"
ON public.settlements FOR INSERT
WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Family members can delete settlements"
ON public.settlements FOR DELETE
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

-- 15. Realtime Publication Setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.families;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Set replica identity to FULL so UPDATE/DELETE change payloads include old record values
ALTER TABLE public.families REPLICA IDENTITY FULL;
ALTER TABLE public.family_members REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.expense_splits REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;
ALTER TABLE public.settlements REPLICA IDENTITY FULL;
ALTER TABLE public.notification_preferences REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 16. Secure RPC for joining a family via invite code
CREATE OR REPLACE FUNCTION public.join_family_via_invite_code(
    p_invite_code TEXT,
    p_display_name TEXT DEFAULT 'New Member'
)
RETURNS JSONB AS $$
DECLARE
    v_family_id UUID;
    v_member_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT id INTO v_family_id
    FROM public.families
    WHERE UPPER(invite_code) = UPPER(TRIM(p_invite_code));

    IF v_family_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    -- Check if user is already a member
    SELECT id INTO v_member_id
    FROM public.family_members
    WHERE family_id = v_family_id AND user_id = auth.uid();

    IF v_member_id IS NOT NULL THEN
        RETURN jsonb_build_object('family_id', v_family_id, 'member_id', v_member_id, 'status', 'already_joined');
    END IF;

    -- Insert new family member
    INSERT INTO public.family_members (
        family_id,
        user_id,
        display_name,
        role,
        color_code
    ) VALUES (
        v_family_id,
        auth.uid(),
        COALESCE(p_display_name, 'New Member'),
        'MEMBER',
        '#3B82F6'
    ) RETURNING id INTO v_member_id;

    RETURN jsonb_build_object('family_id', v_family_id, 'member_id', v_member_id, 'status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Notification Dispatch Triggers
-- A3: Batch Statement Imported
CREATE OR REPLACE FUNCTION public.handle_import_batch_notification()
RETURNS TRIGGER AS $$
DECLARE
  importer_name TEXT;
  rec RECORD;
BEGIN
  SELECT display_name INTO importer_name FROM public.family_members WHERE id = NEW.imported_by_member_id;
  IF importer_name IS NULL THEN importer_name := 'A member'; END IF;

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
      'Statement Imported',
      importer_name || ' imported ' || NEW.total_records || ' expenses totalling €' || NEW.total_amount,
      jsonb_build_object('batch_id', NEW.id, 'file_name', NEW.file_name)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_import_batch ON public.import_batches;
CREATE TRIGGER tr_notify_import_batch
AFTER INSERT ON public.import_batches
FOR EACH ROW EXECUTE FUNCTION public.handle_import_batch_notification();

-- A4: Expense Edited / Deleted
CREATE OR REPLACE FUNCTION public.handle_expense_change_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_id UUID;
  fam_id UUID;
  rec RECORD;
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    fam_id := OLD.family_id;
    actor_id := OLD.paid_by_member_id;
    notif_title := 'Expense Deleted';
    notif_body := 'Expense at ' || OLD.merchant_name || ' (€' || OLD.amount || ') was removed';
  ELSE
    fam_id := NEW.family_id;
    actor_id := NEW.paid_by_member_id;
    notif_title := 'Expense Updated';
    notif_body := 'Expense at ' || NEW.merchant_name || ' was updated to €' || NEW.amount;
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
      notif_title,
      notif_body,
      jsonb_build_object('expense_id', COALESCE(NEW.id, OLD.id))
    );
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_expense_change ON public.expenses;
CREATE TRIGGER tr_notify_expense_change
AFTER UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_expense_change_notification();

-- B1: Settlement Logged
CREATE OR REPLACE FUNCTION public.handle_settlement_notification()
RETURNS TRIGGER AS $$
DECLARE
  payer_name TEXT;
  receiver_name TEXT;
  rec RECORD;
BEGIN
  SELECT display_name INTO payer_name FROM public.family_members WHERE id = NEW.from_member_id;
  SELECT display_name INTO receiver_name FROM public.family_members WHERE id = NEW.to_member_id;
  IF payer_name IS NULL THEN payer_name := 'A member'; END IF;
  IF receiver_name IS NULL THEN receiver_name := 'A member'; END IF;

  FOR rec IN
    SELECT fm.id
    FROM public.family_members fm
    LEFT JOIN public.notification_preferences np ON np.member_id = fm.id
    WHERE fm.family_id = NEW.family_id
      AND fm.id <> NEW.from_member_id
      AND COALESCE(np.push_enabled, true) = true
      AND COALESCE(np.notify_settlements, true) = true
  LOOP
    INSERT INTO public.notifications (family_id, recipient_member_id, actor_member_id, type, title, body, data)
    VALUES (
      NEW.family_id,
      rec.id,
      NEW.from_member_id,
      'SETTLEMENT',
      'Debt Settled',
      payer_name || ' recorded a settlement of €' || NEW.amount || ' to ' || receiver_name,
      jsonb_build_object('settlement_id', NEW.id, 'from_member_id', NEW.from_member_id, 'to_member_id', NEW.to_member_id, 'amount', NEW.amount)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_settlement ON public.settlements;
CREATE TRIGGER tr_notify_settlement
AFTER INSERT ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.handle_settlement_notification();

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_member_lifecycle ON public.family_members;
CREATE TRIGGER tr_notify_member_lifecycle
AFTER INSERT OR UPDATE OF role ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.handle_member_lifecycle_notification();

-- 18. Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user_fam ON public.family_members(user_id, family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_fam ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fam_updated ON public.expenses(family_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_fam_date ON public.expenses(family_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_exp_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_categories_fam_id ON public.categories(family_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_invite_code ON public.families(UPPER(invite_code)) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settlements_fam ON public.settlements(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_member ON public.push_tokens(member_id);
