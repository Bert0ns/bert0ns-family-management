import { z } from 'zod';

export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Family {
  id: string;
  name: string;
  currency: string;
  created_at: string;
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
}

export interface Category {
  id: string;
  family_id: string;
  name: string;
  icon: string;
  color: string;
  is_default?: boolean;
}

export interface ExpenseSplit {
  member_id: string;
  share_amount: number;
  percentage?: number;
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
}

export interface ImportBatch {
  id: string;
  family_id: string;
  imported_by_member_id: string;
  file_name: string;
  total_records: number;
  total_amount: number;
  created_at: string;
  raw_payload?: any;
}

// Zod validation schemas for structured JSON imports
export const ExpenseItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  merchant: z.string().min(1, 'Merchant name is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  category: z.string().default('Uncategorized'),
  notes: z.string().optional(),
  paid_by: z.string().optional(),
  payment_method: z.string().optional(),
  is_recurring: z.boolean().default(false),
  split: z
    .object({
      is_split: z.boolean().default(false),
      type: z.enum(['EQUAL', 'PERCENTAGE', 'EXACT']).default('EQUAL'),
      members: z.array(z.string()).optional(),
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
  currency: z.string().default('EUR'),
  uploaded_by: z.string().optional(),
  expenses: z.array(ExpenseItemSchema).min(1, 'At least one expense is required in the report'),
});

export type RawExpenseItem = z.infer<typeof ExpenseItemSchema>;
export type RawExpenseReport = z.infer<typeof ExpenseReportImportSchema>;

export interface FilterOptions {
  searchQuery: string;
  selectedMemberId?: string;
  selectedCategoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}
