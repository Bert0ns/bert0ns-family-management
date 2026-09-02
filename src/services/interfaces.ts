import { Expense, Category, FamilyMember, RawExpenseReport, Family } from '@/types';

export interface CategorySummary {
  category: Category;
  total: number;
  percentage: number;
  transactionCount: number;
}

export interface MemberSummary {
  member: FamilyMember;
  total: number;
  percentage: number;
  transactionCount: number;
}

export interface DailySpendPoint {
  day: number;
  dateStr: string;
  dailyAmount: number;
  cumulativeAmount: number;
}

export interface MonthlyKPIMetrics {
  totalSpend: number;
  dailyAverageBurn: number;
  projectedMonthEnd: number;
  transactionCount: number;
  topCategory?: CategorySummary;
  topSpender?: MemberSummary;
}

/**
 * Interface Segregation Principle (ISP) & Dependency Inversion Principle (DIP):
 * High-level modules depend on abstractions, and client code only depends on methods it uses.
 */
export interface IAnalyticsCalculator {
  calculateMonthlyMetrics(
    expenses: Expense[],
    categories: Category[],
    members: FamilyMember[],
    period: string,
    referenceDate?: Date,
  ): MonthlyKPIMetrics;

  calculateCategoryBreakdown(expenses: Expense[], categories: Category[]): CategorySummary[];

  calculateMemberContributions(expenses: Expense[], members: FamilyMember[]): MemberSummary[];

  calculateSpendingVelocity(expenses: Expense[], period: string): DailySpendPoint[];
}

export interface IReportValidator {
  validate(rawJson: unknown): {
    success: boolean;
    data?: RawExpenseReport;
    error?: string;
  };
}

export interface IExpenseRepository {
  getExpenses(): Expense[];
  getMembers(): FamilyMember[];
  getCategories(): Category[];
  getFamily(): Family;
  addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'family_id'>): Expense;
  updateExpense(id: string, updates: Partial<Expense>): void;
  deleteExpense(id: string): void;
  importBatch(
    report: RawExpenseReport,
    fileName: string,
  ): { importedCount: number; totalAmount: number; batchId: string };
}
