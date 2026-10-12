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

export interface MonthlyTrendPoint {
  period: string; // YYYY-MM
  label: string; // e.g. "Aug"
  totalSpend: number;
  transactionCount: number;
  momGrowthPercentage: number | null; // null for first baseline month
  rollingAverage: number;
}

export interface ComparativeVelocityData {
  currentPeriod: string;
  previousPeriod: string;
  currentPoints: DailySpendPoint[];
  previousPoints: DailySpendPoint[];
  currentTotal: number;
  previousTotal: number;
  currentElapsedDays: number;
  currentToDate: number;
  previousToDate: number;
  pacingPercentage: number | null;
  daysInMonth: number;
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayOfWeekPoint {
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday (ISO)
  dayKey: DayKey;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
  isWeekend: boolean;
}

export interface DayOfWeekDistribution {
  days: DayOfWeekPoint[];
  totalAmount: number;
  weekdayTotal: number;
  weekendTotal: number;
  weekdayPercentage: number;
  weekendPercentage: number;
  peakDay: DayOfWeekPoint | null;
}

export interface PaymentMethodSummary {
  method: string;
  label: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
  color: string;
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

  calculateHistoricalMonthlyTrends(
    expenses: Expense[],
    currentPeriod: string,
    monthsCount?: number,
  ): MonthlyTrendPoint[];

  calculateComparativeSpendingVelocity(
    expenses: Expense[],
    currentPeriod: string,
    referenceDate?: Date,
  ): ComparativeVelocityData;

  calculateDayOfWeekDistribution(expenses: Expense[], period?: string): DayOfWeekDistribution;

  calculatePaymentMethodDistribution(expenses: Expense[], period?: string): PaymentMethodSummary[];
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
