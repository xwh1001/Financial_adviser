const Formatters = require('../../shared/utils/formatters');
const DateFilter = require('./dateFilter');
const BenchmarkService = require('../services/benchmarkService');

/**
 * Financial Insights Engine - Provides personalized spending insights and money-saving recommendations
 * Specifically tailored for Australian users
 */
class FinancialInsightsEngine {
  constructor(database) {
    this.db = database;
    
    // Initialize ABS benchmark service for official Australian data
    this.benchmarkService = new BenchmarkService();
    
    // Default user location (can be customized per user in future)
    this.defaultLocation = 'victoria';
    this.defaultCity = 'melbourne';
  }

  /**
   * Generate comprehensive personalized insights
   */
  async generatePersonalizedInsights(timeframe = 'ytd', userTimezone = 'Australia/Sydney', userDate = null, userLocation = null, userCity = null) {
    try {
      const userData = await this.getUserFinancialData(timeframe, userTimezone, userDate);
      
      if (!userData || userData.totalTransactions === 0) {
        return this.getEmptyStateInsights();
      }

      const insights = {
        hasData: true,
        summary: userData.summary,
        spendingPatterns: await this.analyzeSpendingPatterns(userData),
        savingsOpportunities: await this.identifySavingsOpportunities(userData),
        budgetRecommendations: await this.generateBudgetRecommendations(userData),
        australianComparison: this.compareToAustralianAverages(userData, userLocation, userCity),
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
  async getUserFinancialData(timeframe, userTimezone = 'Australia/Sydney', userDate = null) {
    const ytdData = await this.db.getYTDSummary();
    
    if (!ytdData || !ytdData.transactions.length) {
      return null;
    }

    // Convert timeframe to months for consistent filtering using user's timezone
    // Note: Always use transaction-level filtering to ensure we have individual transactions for insights
    const months = DateFilter.timeframeToMonths(timeframe, userTimezone, userDate);
    if (!months.length) {
      return null;
    }
    
    // Filter transactions and income using centralized logic
    const filteredTransactions = DateFilter.filterTransactionsByMonths(ytdData.transactions, months);
    const filteredIncome = DateFilter.filterIncomeByMonths(ytdData.income, months);

    if (!filteredTransactions.length) {
      return null;
    }

    // Use centralized calculation logic for consistency
    const result = DateFilter.calculateMonthlySummary(filteredTransactions, filteredIncome);
    
    return {
      ...result,
      timeframe
    };
  }

  /**
   * NOTE: Date filtering logic has been moved to centralized DateFilter utility
   * for consistency between Monthly Analysis and INSIGHTS
   */

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
    const diningOut = (userData.monthlyAverages['DINING_RESTAURANTS'] || 0) + 
                     (userData.monthlyAverages['DINING_TAKEAWAY'] || 0) + 
                     (userData.monthlyAverages['DINING_CAFES'] || 0) + 
                     (userData.monthlyAverages['DINING_PUBS'] || 0) + 
                     (userData.monthlyAverages['DINING_ETHNIC'] || 0);
    const groceries = userData.monthlyAverages['FOOD_GROCERIES'] || 0;
    
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
    const subscriptions = userData.monthlyAverages['RECREATION_STREAMING'] || 0;
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
    const energy = (userData.monthlyAverages['UTILITIES_ELECTRICITY'] || 0) + 
                   (userData.monthlyAverages['UTILITIES_GAS'] || 0);
    const energyBenchmarks = this.benchmarkService.getBenchmarks(this.defaultLocation, this.defaultCity);
    const benchmark = ((energyBenchmarks['UTILITIES_ELECTRICITY'] ? energyBenchmarks['UTILITIES_ELECTRICITY'].amount : 200) + 
                      (energyBenchmarks['UTILITIES_GAS'] ? energyBenchmarks['UTILITIES_GAS'].amount : 120));
    
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
    const monthsWithData = userData.summary.monthsWithData || 1;
    const monthlyIncome = (totalIncome && monthsWithData > 0) ? totalIncome / monthsWithData : 0;

    // Skip budget recommendations if there's no income data
    if (monthlyIncome <= 0) {
      return [{
        type: 'no_income_data',
        title: 'Income Data Required',
        message: 'Upload payslips or add income information to get budget recommendations'
      }];
    }

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

    // Calculate percentages with null checks
    const needsPercentage = monthlyIncome > 0 ? (needs / monthlyIncome) * 100 : 0;
    const wantsPercentage = monthlyIncome > 0 ? (wants / monthlyIncome) * 100 : 0;
    const savingsPercentage = monthlyIncome > 0 ? (currentSavings / monthlyIncome) * 100 : 0;

    recommendations.push({
      type: 'budget_framework',
      title: '50/30/20 Budget Analysis',
      current: {
        needs: needs,
        wants: wants,
        savings: currentSavings,
        needsPercentage: isFinite(needsPercentage) ? needsPercentage : 0,
        wantsPercentage: isFinite(wantsPercentage) ? wantsPercentage : 0,
        savingsPercentage: isFinite(savingsPercentage) ? savingsPercentage : 0
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
  compareToAustralianAverages(userData, userLocation = null, userCity = null) {
    // Use provided location or defaults
    const location = userLocation || this.defaultLocation;
    const city = userCity || this.defaultCity;
    
    // Get comprehensive comparison using ABS benchmark service
    const comparison = this.benchmarkService.compareAllCategories(
      userData.monthlyAverages, 
      location, 
      city
    );
    
    // Return just the categories for backward compatibility, but add metadata
    const result = comparison.categories;
    result._metadata = comparison.summary;
    result._benchmark_source = this.benchmarkService.getBenchmarkMetadata();
    
    return result;
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
        formattedAmount: Formatters.formatCurrency(amount),
        formattedCategory: this.benchmarkService.formatCategoryName(category)
      }));
  }

  calculateNeedsSpending(monthlyAverages) {
    const needsCategories = [
      'FOOD_GROCERIES', 'UTILITIES_ELECTRICITY', 'UTILITIES_GAS', 'UTILITIES_WATER',
      'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'HEALTH_MEDICAL', 'HEALTH_PHARMACY',
      'HOUSING_RENT', 'HOUSING_MORTGAGE', 'INSURANCE_GENERAL', 'HEALTH_INSURANCE'
    ];

    return needsCategories.reduce((sum, category) => {
      return sum + (monthlyAverages[category] || 0);
    }, 0);
  }

  calculateWantsSpending(monthlyAverages) {
    const wantsCategories = [
      'DINING_RESTAURANTS', 'DINING_TAKEAWAY', 'DINING_CAFES', 'DINING_PUBS', 'DINING_ETHNIC',
      'RECREATION_STREAMING', 'RECREATION_ENTERTAINMENT', 'RECREATION_SPORTS', 'RECREATION_TRAVEL',
      'CLOTHING_APPAREL', 'CLOTHING_FOOTWEAR', 'HOUSEHOLD_FURNITURE', 'HOUSEHOLD_APPLIANCES',
      'PERSONAL_CARE', 'RECREATION_HOBBIES', 'RECREATION_GAMING'
    ];

    return wantsCategories.reduce((sum, category) => {
      return sum + (monthlyAverages[category] || 0);
    }, 0);
  }

  // Note: calculatePercentile is now handled by BenchmarkService

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
      const percentage = (userData.summary.totalExpenses && userData.summary.totalExpenses > 0) 
        ? (topCategory.amount / userData.summary.totalExpenses) * 100 
        : 0;
      
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
          .map(([cat, amount]) => ({ category: cat, amount, formattedCategory: this.benchmarkService.formatCategoryName(cat) }))
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
          .map(([cat, amount]) => ({ category: cat, amount, formattedCategory: this.benchmarkService.formatCategoryName(cat) }))
      });
    }

    return adjustments;
  }

  isNeedsCategory(category) {
    const needs = [
      'FOOD_GROCERIES', 'UTILITIES_ELECTRICITY', 'UTILITIES_GAS', 'UTILITIES_WATER',
      'TRANSPORT_FUEL', 'TRANSPORT_PUBLIC', 'HEALTH_MEDICAL', 'HEALTH_PHARMACY',
      'HOUSING_RENT', 'HOUSING_MORTGAGE', 'INSURANCE_GENERAL', 'HEALTH_INSURANCE'
    ];
    return needs.includes(category);
  }

  isWantsCategory(category) {
    const wants = [
      'DINING_RESTAURANTS', 'DINING_TAKEAWAY', 'DINING_CAFES', 'DINING_PUBS', 'DINING_ETHNIC',
      'RECREATION_STREAMING', 'RECREATION_ENTERTAINMENT', 'RECREATION_SPORTS', 'RECREATION_TRAVEL',
      'CLOTHING_APPAREL', 'CLOTHING_FOOTWEAR', 'HOUSEHOLD_FURNITURE', 'HOUSEHOLD_APPLIANCES',
      'PERSONAL_CARE', 'RECREATION_HOBBIES', 'RECREATION_GAMING'
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