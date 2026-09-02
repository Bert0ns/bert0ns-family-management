import { Expense, Category, FamilyMember } from '@/types';
import {
  IAnalyticsCalculator,
  CategorySummary,
  MemberSummary,
  DailySpendPoint,
  MonthlyKPIMetrics,
} from './interfaces';

export { CategorySummary, MemberSummary, DailySpendPoint, MonthlyKPIMetrics };

/**
 * AnalyticsCalculator implements IAnalyticsCalculator following the Single Responsibility Principle.
 */
export class AnalyticsCalculator implements IAnalyticsCalculator {
  calculateMonthlyMetrics(
    expenses: Expense[],
    categories: Category[],
    members: FamilyMember[],
    period: string,
    referenceDate: Date = new Date(),
  ): MonthlyKPIMetrics {
    const periodExpenses = expenses.filter((e) => e.transaction_date.startsWith(period));
    const totalSpend = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth() + 1;
    const isCurrentPeriod = year === refYear && month === refMonth;
    const isPastPeriod = year < refYear || (year === refYear && month < refMonth);

    let daysElapsed: number;
    let projectedMonthEnd: number;

    if (isPastPeriod) {
      // Completed month - no projection, use actual total spend
      daysElapsed = totalDaysInMonth;
      projectedMonthEnd = totalSpend;
    } else if (isCurrentPeriod) {
      // Current active month - use actual calendar day of month
      daysElapsed = Math.min(Math.max(referenceDate.getDate(), 1), totalDaysInMonth);
      const dailyAverageBurn = daysElapsed > 0 ? totalSpend / daysElapsed : 0;
      projectedMonthEnd = dailyAverageBurn * totalDaysInMonth;
    } else {
      // Future month
      daysElapsed = 1;
      projectedMonthEnd = totalSpend;
    }

    const dailyAverageBurn = daysElapsed > 0 ? totalSpend / daysElapsed : 0;

    const catSummaries = this.calculateCategoryBreakdown(periodExpenses, categories);
    const memSummaries = this.calculateMemberContributions(periodExpenses, members);

    return {
      totalSpend,
      dailyAverageBurn,
      projectedMonthEnd,
      transactionCount: periodExpenses.length,
      topCategory: catSummaries[0],
      topSpender: memSummaries[0],
    };
  }

  calculateCategoryBreakdown(expenses: Expense[], categories: Category[]): CategorySummary[] {
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const catMap = new Map<string, { total: number; count: number }>();

    expenses.forEach((e) => {
      const current = catMap.get(e.category_id) || { total: 0, count: 0 };
      catMap.set(e.category_id, {
        total: current.total + e.amount,
        count: current.count + 1,
      });
    });

    const summaries: CategorySummary[] = [];
    categories.forEach((cat) => {
      const data = catMap.get(cat.id);
      if (data && data.total > 0) {
        summaries.push({
          category: cat,
          total: data.total,
          percentage: totalSpend > 0 ? (data.total / totalSpend) * 100 : 0,
          transactionCount: data.count,
        });
      }
    });

    return summaries.sort((a, b) => b.total - a.total);
  }

  calculateMemberContributions(expenses: Expense[], members: FamilyMember[]): MemberSummary[] {
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const memMap = new Map<string, { total: number; count: number }>();

    expenses.forEach((e) => {
      const current = memMap.get(e.paid_by_member_id) || { total: 0, count: 0 };
      memMap.set(e.paid_by_member_id, {
        total: current.total + e.amount,
        count: current.count + 1,
      });
    });

    const summaries: MemberSummary[] = [];
    members.forEach((mem) => {
      const data = memMap.get(mem.id);
      if (data && data.total > 0) {
        summaries.push({
          member: mem,
          total: data.total,
          percentage: totalSpend > 0 ? (data.total / totalSpend) * 100 : 0,
          transactionCount: data.count,
        });
      } else {
        summaries.push({
          member: mem,
          total: 0,
          percentage: 0,
          transactionCount: 0,
        });
      }
    });

    return summaries.sort((a, b) => b.total - a.total);
  }

  calculateSpendingVelocity(expenses: Expense[], period: string): DailySpendPoint[] {
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const totalDays = new Date(year, month, 0).getDate();

    const dayAmounts = new Map<number, number>();
    expenses
      .filter((e) => e.transaction_date.startsWith(period))
      .forEach((e) => {
        const day = parseInt(e.transaction_date.split('-')[2], 10);
        dayAmounts.set(day, (dayAmounts.get(day) || 0) + e.amount);
      });

    let runningTotal = 0;
    const points: DailySpendPoint[] = [];

    for (let d = 1; d <= totalDays; d++) {
      const amount = dayAmounts.get(d) || 0;
      runningTotal += amount;
      const dateStr = `${period}-${String(d).padStart(2, '0')}`;
      points.push({
        day: d,
        dateStr,
        dailyAmount: amount,
        cumulativeAmount: runningTotal,
      });
    }

    return points;
  }
}

export const analyticsCalculator = new AnalyticsCalculator();

// Function exports for convenience
export const calculateMonthlyMetrics = (
  expenses: Expense[],
  categories: Category[],
  members: FamilyMember[],
  period: string,
  referenceDate?: Date,
) =>
  analyticsCalculator.calculateMonthlyMetrics(expenses, categories, members, period, referenceDate);

export const calculateCategoryBreakdown = (expenses: Expense[], categories: Category[]) =>
  analyticsCalculator.calculateCategoryBreakdown(expenses, categories);

export const calculateMemberContributions = (expenses: Expense[], members: FamilyMember[]) =>
  analyticsCalculator.calculateMemberContributions(expenses, members);

export const calculateSpendingVelocity = (expenses: Expense[], period: string) =>
  analyticsCalculator.calculateSpendingVelocity(expenses, period);
