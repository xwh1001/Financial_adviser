/**
 * Centralized Date Filtering Utility
 * 
 * This module provides consistent date filtering logic for both Monthly Analysis
 * and INSIGHTS to ensure data consistency across the application.
 * 
 * Handles timezone conversion for GMT+10 (Australia/Sydney) to ensure accurate
 * date filtering for financial data.
 */

class DateFilter {
  // Australia/Sydney timezone offset (GMT+10 standard, GMT+11 during DST)
  static TIMEZONE_OFFSET = '+10:00';
  
  /**
   * Convert UTC date to Australian local date for filtering
   * @param {string} utcDateString - UTC date string from database
   * @returns {string} Local date in YYYY-MM-DD format
   */
  static utcToLocalDate(utcDateString) {
    const utcDate = new Date(utcDateString);
    // Convert to GMT+10 by adding 10 hours
    const localDate = new Date(utcDate.getTime() + (10 * 60 * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }
  
  /**
   * Convert local date to UTC boundaries for database queries
   * @param {string} localDate - Local date in YYYY-MM-DD format
   * @returns {Object} { startUTC, endUTC } in ISO format
   */
  static localDateToUTCBoundaries(localDate) {
    // Start of day in GMT+10 = subtract 10 hours for UTC
    const startLocal = new Date(localDate + 'T00:00:00+10:00');
    const endLocal = new Date(localDate + 'T23:59:59.999+10:00');
    
    return {
      startUTC: startLocal.toISOString(),
      endUTC: endLocal.toISOString()
    };
  }
  /**
   * Get the start and end dates for a specific month (timezone-aware)
   * @param {string} month - Month in YYYY-MM format (e.g., "2025-04")
   * @returns {Object} { startDate, endDate, startUTC, endUTC } 
   */
  static getMonthBoundaries(month) {
    const [year, monthNum] = month.split('-');
    const yearInt = parseInt(year);
    const monthInt = parseInt(monthNum);
    
    // First day of the month (local)
    const startDate = `${year}-${monthNum}-01`;
    
    // Last day of the month (local)
    const lastDayNum = new Date(yearInt, monthInt, 0).getDate();
    const endDate = `${year}-${monthNum}-${String(lastDayNum).padStart(2, '0')}`;
    
    // Convert to UTC boundaries for accurate database queries
    const startBoundaries = this.localDateToUTCBoundaries(startDate);
    const endBoundaries = this.localDateToUTCBoundaries(endDate);
    
    return { 
      startDate, 
      endDate,
      startUTC: startBoundaries.startUTC,
      endUTC: endBoundaries.endUTC
    };
  }

  /**
   * Get filtered transactions for specific months from raw transaction data (timezone-aware)
   * @param {Array} transactions - Array of transaction objects
   * @param {Array} months - Array of month strings in YYYY-MM format
   * @returns {Array} Filtered transactions
   */
  static filterTransactionsByMonths(transactions, months) {
    if (!months || months.length === 0) {
      return transactions;
    }

    return transactions.filter(transaction => {
      // Convert UTC date to local date for accurate month comparison
      const localDate = this.utcToLocalDate(transaction.date);
      const txnMonth = localDate.substring(0, 7); // Extract YYYY-MM
      return months.includes(txnMonth);
    });
  }

  /**
   * Get filtered income records for specific months (timezone-aware)
   * @param {Array} incomeRecords - Array of income objects
   * @param {Array} months - Array of month strings in YYYY-MM format
   * @returns {Array} Filtered income records
   */
  static filterIncomeByMonths(incomeRecords, months) {
    if (!months || months.length === 0) {
      return incomeRecords;
    }

    return incomeRecords.filter(income => {
      const payDateUTC = income.pay_period_end || income.pay_period_start;
      // Convert UTC to local date for accurate month comparison
      const localDate = this.utcToLocalDate(payDateUTC);
      const incomeMonth = localDate.substring(0, 7); // Extract YYYY-MM
      return months.includes(incomeMonth);
    });
  }

  /**
   * Generate SQL conditions for filtering by months (timezone-aware database queries)
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
      const { startUTC, endUTC } = this.getMonthBoundaries(month);
      // Compare directly with UTC timestamps stored in database
      conditions.push(`(${dateColumn} >= ? AND ${dateColumn} <= ?)`);
      params.push(startUTC, endUTC);
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

    // Get unique months for monthsWithData calculation (timezone-aware)
    const monthsWithData = new Set();
    transactions.forEach(txn => {
      const localDate = this.utcToLocalDate(txn.date);
      const monthKey = localDate.substring(0, 7); // Extract YYYY-MM
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
   * @param {string} userTimezone - User's timezone (default: Australia/Sydney)
   * @param {string} userDate - Current date in user's timezone (YYYY-MM-DD format)
   * @returns {Object} Last month data consistent with monthly summaries
   */
  static getLastMonthFromSummaries(ytdData, userTimezone = 'Australia/Sydney', userDate = null) {
    // Use user's current date if provided, otherwise calculate from their timezone
    let now;
    if (userDate) {
      now = new Date(userDate + 'T12:00:00'); // Noon to avoid timezone edge cases
    } else {
      now = new Date();
      // Convert to user's timezone
      now = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    }
    
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // JS months are 0-indexed
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthKey = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`; // Convert back to 1-indexed
    
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
   * @param {string} userTimezone - User's timezone (default: Australia/Sydney)
   * @param {string} userDate - Current date in user's timezone (YYYY-MM-DD format)
   * @returns {Array} Array of month strings in YYYY-MM format
   */
  static timeframeToMonths(timeframe, userTimezone = 'Australia/Sydney', userDate = null) {
    // Use user's current date if provided, otherwise calculate from their timezone
    let now;
    if (userDate) {
      now = new Date(userDate + 'T12:00:00'); // Noon to avoid timezone edge cases
    } else {
      now = new Date();
      // Convert to user's timezone
      now = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    }
    
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