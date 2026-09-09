import { z } from 'zod';

export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type SupportedCurrency = '€' | 'EUR';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type MutationOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type MutationEntity = 'expense' | 'category' | 'member' | 'family';

export interface OutboxMutation {
  id: string;
  entity: MutationEntity;
  operation: MutationOperation;
  entity_id: string;
  payload: any;
  created_at: string;
  retry_count: number;
}

export interface Family {
  id: string;
  name: string;
  currency: '€';
  invite_code?: string;
  created_at: string;
  updated_at?: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id?: string;
  display_name: string;
  role: UserRole;
  avatar_url?: string;
  color_code: string;
  is_current_user?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  family_id: string;
  name: string;
  icon: string;
  color: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseSplit {
  member_id: string;
  share_amount: number;
  percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  family_id: string;
  paid_by_member_id: string;
  category_id: string;
  import_batch_id?: string;
  transaction_date: string; // YYYY-MM-DD
  merchant_name: string;
  amount: number;
  notes?: string;
  payment_method?: string;
  is_recurring?: boolean;
  is_verified?: boolean;
  splits?: ExpenseSplit[];
  created_at: string;
  updated_at?: string;
}

export interface ImportBatch {
  id: string;
  family_id: string;
  imported_by_member_id: string;
  file_name: string;
  total_records: number;
  total_amount: number;
  created_at: string;
  updated_at?: string;
  raw_payload?: any;
}

// Zod validation schemas for structured JSON imports
export const ExpenseItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  merchant: z.string().trim().min(1, 'Merchant name is required').max(120, 'Merchant name too long'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .finite('Amount must be a finite number')
    .max(10_000_000, 'Amount must not exceed 10,000,000'),
  category: z.string().trim().max(80).default('Uncategorized'),
  notes: z.string().trim().max(500).optional(),
  paid_by: z.string().trim().max(100).optional(),
  payment_method: z.string().trim().max(50).optional(),
  is_recurring: z.boolean().default(false),
  split: z
    .object({
      is_split: z.boolean().default(false),
      type: z.enum(['EQUAL', 'PERCENTAGE', 'EXACT']).default('EQUAL'),
      members: z.array(z.string().trim().max(100)).optional(),
    })
    .optional(),
});

export const ExpenseReportImportSchema = z.object({
  report_title: z.string().optional(),
  statement_period: z
    .object({
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    })
    .optional(),
  currency: z
    .enum(['EUR', '€'], {
      message: 'Only EUR (€) currency is supported',
    })
    .default('EUR'),
  uploaded_by: z.string().optional(),
  expenses: z.array(ExpenseItemSchema).min(1, 'At least one expense is required in the report'),
});

export type RawExpenseItem = z.infer<typeof ExpenseItemSchema>;
export type RawExpenseReport = z.infer<typeof ExpenseReportImportSchema>;

export type PeriodPreset = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year';
export type AmountBracket = 'all' | 'under_20' | '20_to_100' | 'over_100';

export interface FilterOptions {
  searchQuery: string;
  selectedMemberId?: string;
  selectedCategoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  periodPreset?: PeriodPreset;
  amountBracket?: AmountBracket;
}
