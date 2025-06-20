const Formatters = require('../../shared/utils/formatters');

/**
 * Financial Insights Engine - Provides personalized spending insights and money-saving recommendations
 * Specifically tailored for Australian users
 */
class FinancialInsightsEngine {
  constructor(database) {
    this.db = database;
    
    // Australian spending benchmarks (monthly averages)
    this.australianBenchmarks = {
      'GROCERIES': { low: 400, medium: 600, high: 800 },
      'DINING_OUT': { low: 200, medium: 400, high: 600 },
      'TRANSPORT_FUEL': { low: 200, medium: 300, high: 450 },
      'UTILITIES_ENERGY': { low: 150, medium: 250, high: 350 },
      'ENTERTAINMENT_STREAMING': { low: 30, medium: 60, high: 100 },
      'TRANSPORT_PUBLIC': { low: 100, medium: 200, high: 300 },
      'SHOPPING_CLOTHING': { low: 100, medium: 250, high: 500 }
    };

    // City cost of living multipliers
    this.cityMultipliers = {
      'sydney': 1.15,
      'melbourne': 1.10,
      'brisbane': 1.05,
      'perth': 1.05,
      'adelaide': 1.00,
      'canberra': 1.12,
      'darwin': 1.08,
      'hobart': 0.95
    };
  }

  /**
   * Generate comprehensive personalized insights
   */
  async generatePersonalizedInsights(timeframe = 'ytd') {
    try {
      const userData = await this.getUserFinancialData(timeframe);
      
      if (!userData || userData.totalTransactions === 0) {
        return this.getEmptyStateInsights();
      }

      const insights = {
        hasData: true,
        summary: userData.summary,
        spendingPatterns: await this.analyzeSpendingPatterns(userData),
        savingsOpportunities: await this.identifySavingsOpportunities(userData),
        budgetRecommendations: await this.generateBudgetRecommendations(userData),
        australianComparison: this.compareToAustralianAverages(userData),
        actionPlan: await this.createActionPlan(userData),
        metadata: {
          analysisDate: new Date().toISOString(),
          timeframe,
          dataPoints: userData.totalTransactions
        }
      };

      return insights;

    } catch (error) {
      console.error('❌ Failed to generate insights:', error.message);
      throw new Error(`Insights generation failed: ${error.message}`);
    }
  }

  /**
   * Get user financial data for analysis
   */
  async getUserFinancialData(timeframe) {
    const ytdData = await this.db.getYTDSummary();
    
    if (!ytdData || !ytdData.transactions.length) {
      return null;
    }

    // Calculate cutoff date based on timeframe
    const cutoffDate = this.getTimeframeCutoffDate(timeframe);
    
    // Filter transactions and income based on timeframe
    const filteredTransactions = ytdData.transactions.filter(txn => {
      return new Date(txn.date) >= cutoffDate;
    });
    
    const filteredIncome = ytdData.income.filter(income => {
      const payDate = new Date(income.pay_period_end || income.pay_period_start);
      return payDate >= cutoffDate;
    });

    if (!filteredTransactions.length) {
      return null;
    }

    // Calculate category totals
    const categories = {};
    filteredTransactions.forEach(txn => {
      categories[txn.category] = (categories[txn.category] || 0) + txn.amount;
    });

    // Calculate summary metrics
    const totalExpenses = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
    const totalIncome = filteredIncome.reduce((sum, income) => sum + (income.net_pay || 0), 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) : 0;

    // Get monthly averages
    const monthsWithData = new Set(filteredTransactions.map(t => t.date.substring(0, 7))).size;
    const monthlyAverages = {};
    Object.entries(categories).forEach(([category, total]) => {
      monthlyAverages[category] = monthsWithData > 0 ? total / monthsWithData : 0;
    });

    return {
      summary: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        monthsWithData
      },
      categories,
      monthlyAverages,
      transactions: filteredTransactions,
      totalTransactions: filteredTransactions.length,
      timeframe
    };
  }

  /**
   * Calculate cutoff date based on timeframe
   */
  getTimeframeCutoffDate(timeframe) {
    const now = new Date();
    let cutoffDate;

    switch (timeframe) {
      case 'last3months':
        cutoffDate = new Date(now);
        cutoffDate.setDate(1); // First day of current month
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
      case 'last6months':
        cutoffDate = new Date(now);
        cutoffDate.setDate(1); // First day of current month
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        break;
      case 'ytd':
      default:
        cutoffDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        break;
    }

    return cutoffDate;
  }

  /**
   * Analyze spending patterns and trends
   */
  async analyzeSpendingPatterns(userData) {
    const patterns = {
      topCategories: this.getTopSpendingCategories(userData.categories),
      spendingTrends: await this.calculateSpendingTrends(userData),
      weeklyPatterns: this.analyzeWeeklyPatterns(userData.transactions),
      unusualTransactions: this.detectUnusualTransactions(userData.transactions)
    };

    return {
      ...patterns,
      insights: this.generatePatternInsights(patterns, userData)
    };
  }

  /**
   * Identify specific savings opportunities
   */
  async identifySavingsOpportunities(userData) {
    const opportunities = [];

    // Dining out vs groceries analysis
    const diningOut = userData.monthlyAverages['DINING_OUT'] || 0;
    const groceries = userData.monthlyAverages['GROCERIES'] || 0;
    
    if (diningOut > groceries * 0.5 && diningOut > 200) {
      const potentialSavings = diningOut * 0.3;
      opportunities.push({
        id: 'reduce-dining-out',
        category: 'Food & Dining',
        type: 'spending_reduction',
        potential: potentialSavings,
        confidence: 0.85,
        priority: 'high',
        title: 'Cook More Meals at Home',
        description: `You spend ${Formatters.formatCurrency(diningOut)}/month on dining out vs ${Formatters.formatCurrency(groceries)} on groceries`,
        suggestion: `Cooking 30% more meals at home could save you ${Formatters.formatCurrency(potentialSavings)}/month`,
        actionPlan: [
          'Plan weekly meals in advance',
          'Buy ingredients for 3-4 home-cooked meals per week',
          'Try meal prep on Sundays',
          'Use grocery delivery to avoid impulse dining decisions'
        ],
        timeline: '30 days to establish habit',
        difficulty: 'medium',
        annualSavings: potentialSavings * 12
      });
    }

    // Subscription optimization
    const subscriptions = userData.monthlyAverages['ENTERTAINMENT_STREAMING'] || 0;
    if (subscriptions > 60) {
      const potentialSavings = subscriptions * 0.4;
      opportunities.push({
        id: 'optimize-subscriptions',
        category: 'Entertainment',
        type: 'subscription_optimization',
        potential: potentialSavings,
        confidence: 0.95,
        priority: 'medium',
        title: 'Optimize Streaming Subscriptions',
        description: `You have ${Formatters.formatCurrency(subscriptions)}/month in streaming subscriptions`,
        suggestion: `Review and consolidate subscriptions could save you ${Formatters.formatCurrency(potentialSavings)}/month`,
        actionPlan: [
          'List all current subscriptions',
          'Cancel unused services for 30+ days',
          'Consider family plans for shared services',
          'Rotate subscriptions seasonally'
        ],
        timeline: 'Immediate - this weekend',
        difficulty: 'easy',
        annualSavings: potentialSavings * 12
      });
    }

    // Transport optimization
    const publicTransport = userData.monthlyAverages['TRANSPORT_PUBLIC'] || 0;
    const rideshare = userData.monthlyAverages['TRANSPORT_RIDESHARE'] || 0;
    const fuel = userData.monthlyAverages['TRANSPORT_FUEL'] || 0;
    
    if (rideshare > publicTransport && rideshare > 200) {
      const potentialSavings = rideshare * 0.6;
      opportunities.push({
        id: 'transport-optimization',
        category: 'Transportation',
        type: 'mode_optimization',
        potential: potentialSavings,
        confidence: 0.75,
        priority: 'medium',
        title: 'Switch to Public Transport',
        description: `Rideshare costs ${Formatters.formatCurrency(rideshare)}/month vs ${Formatters.formatCurrency(publicTransport)} public transport`,
        suggestion: `Using public transport for routine trips could save you ${Formatters.formatCurrency(potentialSavings)}/month`,
        actionPlan: [
          'Get monthly public transport pass',
          'Plan routes for regular destinations',
          'Use rideshare only for late night/emergency trips',
          'Consider bike + public transport combination'
        ],
        timeline: '2 weeks to adjust routine',
        difficulty: 'medium',
        annualSavings: potentialSavings * 12
      });
    }

    // Energy efficiency
    const energy = userData.monthlyAverages['UTILITIES_ENERGY'] || 0;
    const benchmark = this.australianBenchmarks['UTILITIES_ENERGY'].medium;
    
    if (energy > benchmark * 1.3) {
      const potentialSavings = energy * 0.25;
      opportunities.push({
        id: 'energy-efficiency',
        category: 'Utilities',
        type: 'efficiency_improvement',
        potential: potentialSavings,
        confidence: 0.70,
        priority: 'medium',
        title: 'Improve Energy Efficiency',
        description: `Your energy bills (${Formatters.formatCurrency(energy)}/month) are above Australian average`,
        suggestion: `Energy efficiency improvements could save you ${Formatters.formatCurrency(potentialSavings)}/month`,
        actionPlan: [
          'Switch to LED bulbs throughout home',
          'Adjust thermostat by 2-3 degrees',
          'Use cold water for washing clothes',
          'Unplug devices when not in use',
          'Compare energy providers annually'
        ],
        timeline: '1-2 months for full implementation',
        difficulty: 'easy',
        annualSavings: potentialSavings * 12
      });
    }

    return opportunities.sort((a, b) => b.potential - a.potential);
  }

  /**
   * Generate budget recommendations
   */
  async generateBudgetRecommendations(userData) {
    const recommendations = [];
    const { totalIncome, savingsRate } = userData.summary;
    const monthlyIncome = totalIncome / userData.summary.monthsWithData;

    // 50/30/20 rule assessment
    const idealBudget = {
      needs: monthlyIncome * 0.50,
      wants: monthlyIncome * 0.30,
      savings: monthlyIncome * 0.20
    };

    // Categorize spending
    const needs = this.calculateNeedsSpending(userData.monthlyAverages);
    const wants = this.calculateWantsSpending(userData.monthlyAverages);
    const currentSavings = monthlyIncome - needs - wants;

    recommendations.push({
      type: 'budget_framework',
      title: '50/30/20 Budget Analysis',
      current: {
        needs: needs,
        wants: wants,
        savings: currentSavings,
        needsPercentage: (needs / monthlyIncome) * 100,
        wantsPercentage: (wants / monthlyIncome) * 100,
        savingsPercentage: (currentSavings / monthlyIncome) * 100
      },
      ideal: {
        needs: idealBudget.needs,
        wants: idealBudget.wants,
        savings: idealBudget.savings,
        needsPercentage: 50,
        wantsPercentage: 30,
        savingsPercentage: 20
      },
      adjustments: this.calculateBudgetAdjustments(
        { needs, wants, savings: currentSavings },
        idealBudget,
        userData.monthlyAverages
      )
    });

    return recommendations;
  }

  /**
   * Compare to Australian averages
   */
  compareToAustralianAverages(userData) {
    const comparisons = {};

    Object.entries(this.australianBenchmarks).forEach(([category, benchmarks]) => {
      const userSpending = userData.monthlyAverages[category] || 0;
      
      let performance = 'average';
      if (userSpending <= benchmarks.low) performance = 'excellent';
      else if (userSpending <= benchmarks.medium) performance = 'good';
      else if (userSpending <= benchmarks.high) performance = 'average';
      else performance = 'high';

      comparisons[category] = {
        userSpending,
        benchmark: benchmarks.medium,
        performance,
        percentile: this.calculatePercentile(userSpending, benchmarks),
        savings: userSpending > benchmarks.medium ? userSpending - benchmarks.medium : 0
      };
    });

    return comparisons;
  }

  /**
   * Create actionable plan
   */
  async createActionPlan(userData) {
    const opportunities = await this.identifySavingsOpportunities(userData);
    const totalPotential = opportunities.reduce((sum, opp) => sum + opp.potential, 0);

    // Prioritize by impact and difficulty
    const prioritized = opportunities
      .sort((a, b) => {
        const scoreA = a.potential * a.confidence / this.getDifficultyMultiplier(a.difficulty);
        const scoreB = b.potential * b.confidence / this.getDifficultyMultiplier(b.difficulty);
        return scoreB - scoreA;
      })
      .slice(0, 5); // Top 5 recommendations

    return {
      totalPotentialSavings: totalPotential,
      annualPotential: totalPotential * 12,
      quickWins: prioritized.filter(opp => opp.difficulty === 'easy').slice(0, 3),
      mediumTermGoals: prioritized.filter(opp => opp.difficulty === 'medium').slice(0, 3),
      longTermTargets: prioritized.filter(opp => opp.difficulty === 'hard').slice(0, 2),
      implementationOrder: prioritized.map((opp, index) => ({
        order: index + 1,
        id: opp.id,
        title: opp.title,
        timeline: opp.timeline,
        impact: opp.potential
      }))
    };
  }

  /**
   * Helper methods
   */
  getTopSpendingCategories(categories, limit = 5) {
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([category, amount]) => ({
        category,
        amount,
        formattedAmount: Formatters.formatCurrency(amount)
      }));
  }

  calculateNeedsSpending(monthlyAverages) {
    const needsCategories = [
      'GROCERIES', 'UTILITIES_ENERGY', 'UTILITIES_WATER', 'UTILITIES_COUNCIL',
      'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'HEALTH_MEDICAL', 'HEALTH_PHARMACY',
      'HOUSING_RENT', 'HOUSING_MORTGAGE', 'INSURANCE'
    ];

    return needsCategories.reduce((sum, category) => {
      return sum + (monthlyAverages[category] || 0);
    }, 0);
  }

  calculateWantsSpending(monthlyAverages) {
    const wantsCategories = [
      'DINING_OUT', 'ENTERTAINMENT_STREAMING', 'ENTERTAINMENT_ACTIVITIES',
      'SHOPPING_CLOTHING', 'SHOPPING_ELECTRONICS', 'SHOPPING_HOME',
      'PERSONAL_CARE', 'ENTERTAINMENT_TRAVEL'
    ];

    return wantsCategories.reduce((sum, category) => {
      return sum + (monthlyAverages[category] || 0);
    }, 0);
  }

  calculatePercentile(value, benchmarks) {
    if (value <= benchmarks.low) return 25;
    if (value <= benchmarks.medium) return 50;
    if (value <= benchmarks.high) return 75;
    return 90;
  }

  getDifficultyMultiplier(difficulty) {
    const multipliers = { easy: 1, medium: 2, hard: 3 };
    return multipliers[difficulty] || 2;
  }

  getEmptyStateInsights() {
    return {
      hasData: false,
      message: 'Upload some bank statements and payslips to get personalized insights!',
      nextSteps: [
        'Upload recent bank statements',
        'Add payslip information',
        'Let the system analyze your spending patterns',
        'Get personalized savings recommendations'
      ]
    };
  }

  generatePatternInsights(patterns, userData) {
    const insights = [];

    // Top spending insight
    if (patterns.topCategories.length > 0) {
      const topCategory = patterns.topCategories[0];
      const percentage = (topCategory.amount / userData.summary.totalExpenses) * 100;
      
      insights.push({
        type: 'top_spending',
        message: `${Formatters.formatCategoryName(topCategory.category)} is your largest expense category at ${percentage.toFixed(1)}% of spending`,
        actionable: percentage > 30,
        suggestion: percentage > 30 ? 'Consider reviewing this category for savings opportunities' : null
      });
    }

    return insights;
  }

  calculateBudgetAdjustments(current, ideal, monthlyAverages) {
    const adjustments = [];

    if (current.needs > ideal.needs) {
      adjustments.push({
        type: 'reduce_needs',
        message: `Reduce essential expenses by ${Formatters.formatCurrency(current.needs - ideal.needs)}`,
        categories: Object.entries(monthlyAverages)
          .filter(([cat]) => this.isNeedsCategory(cat))
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([cat, amount]) => ({ category: cat, amount }))
      });
    }

    if (current.wants > ideal.wants) {
      adjustments.push({
        type: 'reduce_wants',
        message: `Reduce discretionary spending by ${Formatters.formatCurrency(current.wants - ideal.wants)}`,
        categories: Object.entries(monthlyAverages)
          .filter(([cat]) => this.isWantsCategory(cat))
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([cat, amount]) => ({ category: cat, amount }))
      });
    }

    return adjustments;
  }

  isNeedsCategory(category) {
    const needs = [
      'GROCERIES', 'UTILITIES_ENERGY', 'UTILITIES_WATER', 'UTILITIES_COUNCIL',
      'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'HEALTH_MEDICAL', 'HEALTH_PHARMACY',
      'HOUSING_RENT', 'HOUSING_MORTGAGE', 'INSURANCE'
    ];
    return needs.includes(category);
  }

  isWantsCategory(category) {
    const wants = [
      'DINING_OUT', 'ENTERTAINMENT_STREAMING', 'ENTERTAINMENT_ACTIVITIES',
      'SHOPPING_CLOTHING', 'SHOPPING_ELECTRONICS', 'SHOPPING_HOME',
      'PERSONAL_CARE', 'ENTERTAINMENT_TRAVEL'
    ];
    return wants.includes(category);
  }

  async calculateSpendingTrends(userData) {
    // This would require more sophisticated time-series analysis
    // For now, return basic trend information
    return {
      direction: 'stable',
      monthlyGrowthRate: 0,
      volatility: 'low'
    };
  }

  analyzeWeeklyPatterns(transactions) {
    // Basic weekly pattern analysis
    const weekdaySpending = {};
    
    transactions.forEach(txn => {
      const date = new Date(txn.date);
      const dayOfWeek = date.getDay();
      weekdaySpending[dayOfWeek] = (weekdaySpending[dayOfWeek] || 0) + txn.amount;
    });

    return weekdaySpending;
  }

  detectUnusualTransactions(transactions) {
    // Basic outlier detection
    const amounts = transactions.map(t => t.amount).sort((a, b) => a - b);
    const q3Index = Math.floor(amounts.length * 0.75);
    const q3 = amounts[q3Index];
    const iqr = q3 - amounts[Math.floor(amounts.length * 0.25)];
    const threshold = q3 + 1.5 * iqr;

    return transactions
      .filter(t => t.amount > threshold)
      .map(t => ({
        ...t,
        reason: 'unusually_high_amount',
        threshold
      }));
  }
}

module.exports = FinancialInsightsEngine;