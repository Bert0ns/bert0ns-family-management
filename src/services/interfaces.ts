import {
  Expense,
  Category,
  FamilyMember,
  Budget,
  RawExpenseReport,
  FilterOptions,
  Family,
  ImportBatch,
} from '@/types';
import { MonthlyKPIMetrics, CategorySummary, MemberSummary, DailySpendPoint } from './analytics';

/**
 * Interface Segregation Principle (ISP) & Dependency Inversion Principle (DIP):
 * High-level modules depend on abstractions, and client code only depends on methods it uses.
 */

export interface IAnalyticsCalculator {
  calculateMonthlyMetrics(
    expenses: Expense[],
    budgets: Budget[],
    categories: Category[],
    members: FamilyMember[],
    period: string,
  ): MonthlyKPIMetrics;

  calculateCategoryBreakdown(expenses: Expense[], categories: Category[]): CategorySummary[];

  calculateMemberContributions(expenses: Expense[], members: FamilyMember[]): MemberSummary[];

  calculateSpendingVelocity(
    expenses: Expense[],
    totalBudget: number,
    period: string,
  ): DailySpendPoint[];
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
  getBudgets(): Budget[];
  getFamily(): Family;
  addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'family_id'>): Expense;
  updateExpense(id: string, updates: Partial<Expense>): void;
  deleteExpense(id: string): void;
  importBatch(
    report: RawExpenseReport,
    fileName: string,
  ): { importedCount: number; totalAmount: number; batchId: string };
}
