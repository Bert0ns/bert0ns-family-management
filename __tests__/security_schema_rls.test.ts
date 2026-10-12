import { useAppStore } from '@/services/store';

declare const require: (module: string) => any;
declare const __dirname: string;

const fs = require('fs');
const path = require('path');

describe('Database Security & RLS Policy Hardening', () => {
  const schemaPath = path.resolve(__dirname, '../src/data/supabase_schema.sql');
  const schemaSql: string = fs.readFileSync(schemaPath, 'utf8');

  it('declares is_admin_of_family helper function with SECURITY DEFINER and search_path set', () => {
    expect(schemaSql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.is_admin_of_family\(f_id UUID\)[\s\S]*?SECURITY DEFINER SET search_path = public, pg_temp;/,
    );
  });

  it('declares is_member_of_family helper function with SECURITY DEFINER and search_path set', () => {
    expect(schemaSql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.is_member_of_family\(f_id UUID\)[\s\S]*?SECURITY DEFINER SET search_path = public, pg_temp;/,
    );
  });

  it('enforces search_path on all SECURITY DEFINER functions in schema', () => {
    // Find all occurrences of SECURITY DEFINER and ensure they include SET search_path
    const matches = schemaSql.match(/SECURITY DEFINER.*?;/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(7);
    matches.forEach((match: string) => {
      expect(match).toContain('SET search_path = public, pg_temp');
    });
  });

  it('restricts family_members INSERT so arbitrary users cannot insert themselves into existing families', () => {
    expect(schemaSql).toContain('CREATE POLICY "Authorized users can insert family members"');
    // Ensure it verifies NOT EXISTS (SELECT 1 FROM public.family_members ...) OR is_member_of_family
    expect(schemaSql).toMatch(
      /NOT EXISTS \(\s*SELECT 1 FROM public\.family_members fm\s*WHERE fm\.family_id = family_members\.family_id\s*\)\s*OR public\.is_member_of_family\(family_id\)/,
    );
  });

  it('restricts family_members UPDATE so non-admins cannot self-promote to ADMIN', () => {
    expect(schemaSql).toContain('CREATE POLICY "Family members can update members"');
    expect(schemaSql).toMatch(/role <> 'ADMIN' OR public\.is_admin_of_family\(family_id\)/);
  });

  it('enforces RLS policies for budgets and import_batches scoped to active family', () => {
    expect(schemaSql).toMatch(
      /CREATE POLICY "budgets_family_access" ON public\.budgets[\s\S]*?family_id IN \(SELECT family_id FROM public\.family_members WHERE user_id = auth\.uid\(\)\)/,
    );
    expect(schemaSql).toMatch(
      /CREATE POLICY "import_batches_family_access" ON public\.import_batches[\s\S]*?family_id IN \(SELECT family_id FROM public\.family_members WHERE user_id = auth\.uid\(\)\)/,
    );
  });
});

describe('Store Tenant Isolation and ID Tampering Prevention', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  it('strips injected id and family_id in addExpense and assigns secure defaults', () => {
    const store = useAppStore.getState();
    const maliciousInput = {
      paid_by_member_id: store.members[0].id,
      category_id: store.categories[0].id,
      amount: 99.5,
      merchant_name: 'Supermarket',
      transaction_date: '2026-08-15',
      id: 'attacker-injected-id',
      family_id: 'foreign-family-id',
    };

    const created = store.addExpense(maliciousInput as any);

    expect(created.id).not.toBe('attacker-injected-id');
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(created.family_id).toBe(store.family.id);
    expect(created.family_id).not.toBe('foreign-family-id');

    const inState = useAppStore.getState().expenses.find((e) => e.id === created.id);
    expect(inState?.id).toBe(created.id);
    expect(inState?.family_id).toBe(store.family.id);
  });

  it('prevents rewriting id and family_id during updateExpense', () => {
    const store = useAppStore.getState();
    const targetExpense = store.expenses[0];
    const originalId = targetExpense.id;
    const originalFamilyId = targetExpense.family_id;

    store.updateExpense(originalId, {
      amount: 150.0,
      id: 'hijacked-expense-id',
      family_id: 'cross-tenant-family-id',
    } as any);

    const updated = useAppStore.getState().expenses.find((e) => e.id === originalId);
    expect(updated).toBeDefined();
    expect(updated?.id).toBe(originalId);
    expect(updated?.family_id).toBe(originalFamilyId);
    expect(updated?.amount).toBe(150.0);

    // Verify hijacked ID does not exist in store
    const hijacked = useAppStore.getState().expenses.find((e) => e.id === 'hijacked-expense-id');
    expect(hijacked).toBeUndefined();
  });

  it('strips injected id and family_id in addMember', () => {
    const store = useAppStore.getState();
    const maliciousMember = {
      display_name: 'Injected Member',
      role: 'MEMBER' as const,
      color_code: '#10B981',
      id: 'malicious-member-id',
      family_id: 'foreign-family-id',
    };

    const created = store.addMember(maliciousMember as any);

    expect(created.id).not.toBe('malicious-member-id');
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(created.family_id).toBe(store.family.id);

    const inState = useAppStore.getState().members.find((m) => m.id === created.id);
    expect(inState?.id).toBe(created.id);
    expect(inState?.family_id).toBe(store.family.id);
  });

  it('prevents rewriting id and family_id during updateMember', () => {
    const store = useAppStore.getState();
    const targetMember = store.members[0];
    const originalId = targetMember.id;
    const originalFamilyId = targetMember.family_id;

    store.updateMember(originalId, {
      display_name: 'Renamed Member',
      id: 'hijacked-member-id',
      family_id: 'foreign-family-id',
    } as any);

    const updated = useAppStore.getState().members.find((m) => m.id === originalId);
    expect(updated).toBeDefined();
    expect(updated?.id).toBe(originalId);
    expect(updated?.family_id).toBe(originalFamilyId);
    expect(updated?.display_name).toBe('Renamed Member');
  });

  it('strips injected id and family_id in addCategory', () => {
    const store = useAppStore.getState();
    const maliciousCategory = {
      name: 'Custom Utilities',
      icon: 'Zap',
      color: '#F59E0B',
      id: 'malicious-category-id',
      family_id: 'foreign-family-id',
    };

    const created = store.addCategory(maliciousCategory as any);

    expect(created.id).not.toBe('malicious-category-id');
    expect(created.family_id).toBe(store.family.id);
  });

  it('prevents rewriting family id during updateFamilySettings', () => {
    const store = useAppStore.getState();
    const originalId = store.family.id;

    store.updateFamilySettings({
      name: 'New Family Name',
      id: 'tampered-family-id',
    } as any);

    const updated = useAppStore.getState().family;
    expect(updated.id).toBe(originalId);
    expect(updated.name).toBe('New Family Name');
  });
});
