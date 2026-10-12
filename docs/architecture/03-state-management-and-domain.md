### 5.3 Historical Monthly Trends & Rolling Average Algorithm

In [`AnalyticsCalculator.calculateHistoricalMonthlyTrends`](file:///home/berto/bert0ns-family-management/src/services/analytics.ts#L300-L360), cash flow trends are evaluated over a chronological multi-month sliding window (default 6 months):

1. **Window Generation:** Computes $K$ chronological `YYYY-MM` periods terminating at the selected period $T$.
2. **MoM Percentage Growth:** For month $i > 0$:

   $$ \Delta%_i = \begin{cases}
   \frac{S_i - S_{i-1}}{S_{i-1}} \times 100 & \text{if } S_{i-1} > 0 \\
   100\% & \text{if } S_{i-1} = 0 \text{ and } S_i > 0 \\
   0\% & \text{if } S_{i-1} = 0 \text{ and } S_i = 0
   \end{cases}$$

   $$

3. **3-Month Rolling Average:** Dampens short-term monthly volatility by evaluating the mean over up to 3 backward-looking window months:

   $$R_i = \frac{1}{\min(i + 1, 3)} \sum_{j = \max(0, i - 2)}^{i} S_j$$
