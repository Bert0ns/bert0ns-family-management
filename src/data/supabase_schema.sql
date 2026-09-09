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
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 10. Row Level Security (RLS) Helper Functions & Policies
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

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

-- 11. Realtime Publication Setup
-- Enables Supabase Realtime WebSocket notifications for subscribed clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.families;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;

-- Set replica identity to FULL so UPDATE/DELETE change payloads include old record values
ALTER TABLE public.families REPLICA IDENTITY FULL;
ALTER TABLE public.family_members REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.expense_splits REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;

-- 11. Secure RPC for joining a family via invite code
CREATE OR REPLACE FUNCTION public.join_family_via_invite_code(
    p_invite_code TEXT,
    p_display_name TEXT DEFAULT 'New Member'
)
RETURNS JSONB AS 43831
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
43831 LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Performance Optimization Indexes for High-Frequency Sync Queries
CREATE INDEX IF NOT EXISTS idx_family_members_user_fam ON public.family_members(user_id, family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_fam ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fam_updated ON public.expenses(family_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_fam_date ON public.expenses(family_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_exp_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_categories_fam_id ON public.categories(family_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_invite_code ON public.families(UPPER(invite_code)) WHERE invite_code IS NOT NULL;
