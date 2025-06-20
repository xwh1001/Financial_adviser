/**
 * Centralized Date Filtering Utility
 * 
 * This module provides consistent date filtering logic for both Monthly Analysis
 * and INSIGHTS to ensure data consistency across the application.
 */

class DateFilter {
  /**
   * Get the start and end dates for a specific month
   * @param {string} month - Month in YYYY-MM format (e.g., "2025-04")
   * @returns {Object} { startDate, endDate } in YYYY-MM-DD format
   */
  static getMonthBoundaries(month) {
    const [year, monthNum] = month.split('-');
    const yearInt = parseInt(year);
    const monthInt = parseInt(monthNum);
    
    // First day of the month
    const startDate = `${year}-${monthNum}-01`;
    
    // Last day of the month
    const lastDayNum = new Date(yearInt, monthInt, 0).getDate();
    const endDate = `${year}-${monthNum}-${String(lastDayNum).padStart(2, '0')}`;
    
    return { startDate, endDate };
  }

  /**
   * Get filtered transactions for specific months from raw transaction data
   * @param {Array} transactions - Array of transaction objects
   * @param {Array} months - Array of month strings in YYYY-MM format
   * @returns {Array} Filtered transactions
   */
  static filterTransactionsByMonths(transactions, months) {
    if (!months || months.length === 0) {
      return transactions;
    }

    return transactions.filter(transaction => {
      const txnDate = new Date(transaction.date);
      const txnMonth = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      return months.includes(txnMonth);
    });
  }

  /**
   * Get filtered income records for specific months
   * @param {Array} incomeRecords - Array of income objects
   * @param {Array} months - Array of month strings in YYYY-MM format
   * @returns {Array} Filtered income records
   */
  static filterIncomeByMonths(incomeRecords, months) {
    if (!months || months.length === 0) {
      return incomeRecords;
    }

    return incomeRecords.filter(income => {
      const payDate = new Date(income.pay_period_end || income.pay_period_start);
      const incomeMonth = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
      return months.includes(incomeMonth);
    });
  }

  /**
   * Generate SQL conditions for filtering by months (for database queries)
   * @param {Array} months - Array of month strings in YYYY-MM format
   * @param {string} dateColumn - Name of the date column (default: 'date')
   * @returns {Object} { conditions, params } for SQL query
   */
  static generateSQLConditions(months, dateColumn = 'date') {
    if (!months || months.length === 0) {
      return { conditions: '1=1', params: [] };
    }

    const conditions = [];
    const params = [];

    months.forEach(month => {
      const { startDate, endDate } = this.getMonthBoundaries(month);
      conditions.push(`(date(${dateColumn}) >= ? AND date(${dateColumn}) <= ?)`);
      params.push(startDate, endDate);
    });

    return {
      conditions: conditions.join(' OR '),
      params: params
    };
  }

  /**
   * Calculate monthly summary data from filtered transactions and income
   * @param {Array} transactions - Filtered transactions
   * @param {Array} incomeRecords - Filtered income records
   * @returns {Object} Monthly summary data
   */
  static calculateMonthlySummary(transactions, incomeRecords) {
    // Calculate category totals
    const categories = {};
    transactions.forEach(txn => {
      const category = txn.category || 'OTHER';
      categories[category] = (categories[category] || 0) + (txn.amount || 0);
    });

    // Calculate totals
    const totalExpenses = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
    const totalIncome = incomeRecords.reduce((sum, income) => sum + (income.net_pay || 0), 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) : 0;

    // Get unique months for monthsWithData calculation
    const monthsWithData = new Set();
    transactions.forEach(txn => {
      const txnDate = new Date(txn.date);
      const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      monthsWithData.add(monthKey);
    });

    // Calculate monthly averages
    const monthlyAverages = {};
    Object.entries(categories).forEach(([category, total]) => {
      monthlyAverages[category] = monthsWithData.size > 0 ? total / monthsWithData.size : 0;
    });

    return {
      summary: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        monthsWithData: monthsWithData.size
      },
      categories,
      monthlyAverages,
      transactions,
      totalTransactions: transactions.length
    };
  }

  /**
   * Handle special "lastmonth" timeframe to get data from monthly summaries
   * @param {Object} ytdData - YTD data from database
   * @returns {Object} Last month data consistent with monthly summaries
   */
  static getLastMonthFromSummaries(ytdData) {
    const now = new Date();
    const lastMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
    
    // Find the monthly summary for last month
    const lastMonthSummary = ytdData.monthlySummaries.find(summary => summary.month === lastMonthKey);
    
    if (!lastMonthSummary) {
      return null;
    }
    
    // Parse the category breakdown from the stored JSON
    let categories;
    try {
      categories = JSON.parse(lastMonthSummary.category_breakdown);
    } catch (error) {
      console.error('Error parsing category breakdown:', error);
      return null;
    }
    
    // Find income for last month
    const lastMonthIncome = this.filterIncomeByMonths(ytdData.income, [lastMonthKey]);
    
    const totalIncome = lastMonthIncome.reduce((sum, inc) => sum + (inc.net_pay || 0), 0);
    const totalExpenses = lastMonthSummary.total_expenses;
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) : 0;
    
    // Create monthly averages (since it's just one month, monthly average = total)
    const monthlyAverages = { ...categories };
    
    return {
      summary: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        monthsWithData: 1 // Always 1 for last month
      },
      categories,
      monthlyAverages,
      transactions: [], // We don't need individual transactions for insights
      totalTransactions: lastMonthSummary.transaction_count,
      timeframe: 'lastmonth'
    };
  }

  /**
   * Convert timeframe strings to month arrays for consistent filtering
   * @param {string} timeframe - Timeframe identifier (lastmonth, last3months, etc.)
   * @returns {Array} Array of month strings in YYYY-MM format
   */
  static timeframeToMonths(timeframe) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
    
    switch (timeframe) {
      case 'lastmonth':
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        return [`${lastMonthYear}-${String(lastMonth).padStart(2, '0')}`];
        
      case 'last3months': {
        const months = [];
        for (let i = 1; i <= 3; i++) {
          let month = currentMonth - i;
          let year = currentYear;
          if (month <= 0) {
            month += 12;
            year--;
          }
          months.push(`${year}-${String(month).padStart(2, '0')}`);
        }
        return months.reverse(); // Return in chronological order
      }
      
      case 'last6months': {
        const months = [];
        for (let i = 1; i <= 6; i++) {
          let month = currentMonth - i;
          let year = currentYear;
          if (month <= 0) {
            month += 12;
            year--;
          }
          months.push(`${year}-${String(month).padStart(2, '0')}`);
        }
        return months.reverse(); // Return in chronological order
      }
      
      case 'ytd': {
        const months = [];
        for (let i = 1; i <= currentMonth; i++) {
          months.push(`${currentYear}-${String(i).padStart(2, '0')}`);
        }
        return months;
      }
      
      default:
        return [];
    }
  }
}

module.exports = DateFilter;