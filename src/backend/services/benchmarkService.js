const fs = require('fs');
const path = require('path');

/**
 * Benchmark Service - Handles ABS (Australian Bureau of Statistics) benchmark data
 * 
 * This service provides official Australian household spending benchmarks
 * from the ABS Monthly Household Spending Indicator.
 */
class BenchmarkService {
  constructor() {
    this.benchmarkData = null;
    this.dataPath = path.join(__dirname, '../data/abs-benchmarks.json');
    this.loadBenchmarkData();
  }

  /**
   * Load ABS benchmark data from JSON file
   */
  loadBenchmarkData() {
    try {
      const rawData = fs.readFileSync(this.dataPath, 'utf8');
      this.benchmarkData = JSON.parse(rawData);
      console.log(`✅ Loaded ABS benchmarks from ${this.benchmarkData.metadata.period}`);
    } catch (error) {
      console.error('❌ Failed to load ABS benchmark data:', error.message);
      this.benchmarkData = this.getFallbackBenchmarks();
    }
  }

  /**
   * Get benchmarks for a specific location (state/city)
   * @param {string} userLocation - User's location (default: 'victoria')
   * @param {string} userCity - User's city for cost-of-living adjustment
   * @returns {Object} Location-specific benchmarks
   */
  getBenchmarks(userLocation = 'victoria', userCity = null) {
    if (!this.benchmarkData) {
      throw new Error('Benchmark data not available');
    }

    // Get base benchmarks (prefer state-specific, fallback to Australia)
    let baseBenchmarks;
    if (userLocation.toLowerCase() === 'victoria' && this.benchmarkData.victoria) {
      baseBenchmarks = this.benchmarkData.victoria;
    } else {
      baseBenchmarks = this.benchmarkData.australia;
    }

    // Apply city cost-of-living multiplier if specified
    if (userCity && this.benchmarkData.city_multipliers) {
      const cityKey = userCity.toLowerCase().replace(/\s+/g, '_');
      const multiplier = this.benchmarkData.city_multipliers[cityKey] || 1.0;
      
      if (multiplier !== 1.0) {
        const adjustedBenchmarks = {};
        Object.entries(baseBenchmarks).forEach(([category, data]) => {
          adjustedBenchmarks[category] = {
            ...data,
            amount: Math.round(data.amount * multiplier),
            adjusted_for_city: userCity,
            city_multiplier: multiplier
          };
        });
        return adjustedBenchmarks;
      }
    }

    return baseBenchmarks;
  }

  /**
   * Get performance rating based on user spending vs benchmark
   * @param {number} userSpending - User's monthly spending in category
   * @param {number} benchmark - Benchmark amount for category
   * @returns {Object} Performance rating and details
   */
  getPerformanceRating(userSpending, benchmark) {
    if (!this.benchmarkData || !this.benchmarkData.performance_thresholds) {
      return this.getFallbackPerformance(userSpending, benchmark);
    }

    const thresholds = this.benchmarkData.performance_thresholds;
    const ratio = userSpending / benchmark;

    let performance, percentile, message;
    
    if (ratio <= thresholds.excellent) {
      performance = 'excellent';
      percentile = 25;
      message = 'Well below Australian average - excellent spending control';
    } else if (ratio <= thresholds.good) {
      performance = 'good';
      percentile = 40;
      message = 'Below Australian average - good spending habits';
    } else if (ratio <= thresholds.average) {
      performance = 'average';
      percentile = 60;
      message = 'Around Australian average - typical spending';
    } else if (ratio <= thresholds.high) {
      performance = 'above_average';
      percentile = 80;
      message = 'Above Australian average - consider reviewing this category';
    } else {
      performance = 'high';
      percentile = 90;
      message = 'Significantly above Australian average - potential savings opportunity';
    }

    return {
      performance,
      percentile,
      ratio: ratio,
      message,
      savings_potential: userSpending > benchmark ? userSpending - benchmark : 0
    };
  }

  /**
   * Get metadata about the benchmark data source
   * @returns {Object} Benchmark metadata
   */
  getBenchmarkMetadata() {
    return this.benchmarkData ? this.benchmarkData.metadata : null;
  }

  /**
   * Get list of all available categories with descriptions
   * @param {string} userLocation - User's location for category availability
   * @returns {Array} Array of category objects
   */
  getAvailableCategories(userLocation = 'victoria') {
    const benchmarks = this.getBenchmarks(userLocation);
    
    return Object.entries(benchmarks).map(([categoryId, data]) => ({
      id: categoryId,
      name: this.formatCategoryName(categoryId),
      abs_category: data.abs_category,
      description: data.description,
      benchmark_amount: data.amount
    }));
  }

  /**
   * Format category ID to human-readable name
   * @param {string} categoryId - Internal category ID
   * @returns {string} Formatted category name
   */
  formatCategoryName(categoryId) {
    const nameMap = {
      'GROCERIES': 'Groceries',
      'DINING_OUT': 'Dining Out',
      'TRANSPORT_FUEL': 'Transport Fuel',
      'TRANSPORT_PUBLIC': 'Public Transport',
      'UTILITIES_ENERGY': 'Energy Bills',
      'UTILITIES_TELECOM': 'Internet & Phone',
      'ENTERTAINMENT_STREAMING': 'Streaming Services',
      'ENTERTAINMENT_ACTIVITIES': 'Entertainment',
      'SHOPPING_CLOTHING': 'Clothing',
      'HEALTH_MEDICAL': 'Medical',
      'HEALTH_PHARMACY': 'Pharmacy',
      'HOUSING_RENT': 'Rent',
      'INSURANCE': 'Insurance'
    };
    
    return nameMap[categoryId] || categoryId.replace(/_/g, ' ').toLowerCase();
  }

  /**
   * Compare user's spending across all categories
   * @param {Object} userMonthlyAverages - User's monthly spending by category
   * @param {string} userLocation - User's location
   * @param {string} userCity - User's city
   * @returns {Object} Comprehensive comparison results
   */
  compareAllCategories(userMonthlyAverages, userLocation = 'victoria', userCity = null) {
    const benchmarks = this.getBenchmarks(userLocation, userCity);
    const comparisons = {};
    let totalUserSpending = 0;
    let totalBenchmarkSpending = 0;
    let totalSavingsPotential = 0;

    Object.entries(benchmarks).forEach(([categoryId, benchmarkData]) => {
      const userSpending = userMonthlyAverages[categoryId] || 0;
      const benchmarkAmount = benchmarkData.amount;
      const performance = this.getPerformanceRating(userSpending, benchmarkAmount);

      totalUserSpending += userSpending;
      totalBenchmarkSpending += benchmarkAmount;
      totalSavingsPotential += performance.savings_potential;

      comparisons[categoryId] = {
        userSpending,
        benchmark: benchmarkAmount,
        abs_category: benchmarkData.abs_category,
        description: benchmarkData.description,
        ...performance
      };
    });

    return {
      categories: comparisons,
      summary: {
        totalUserSpending,
        totalBenchmarkSpending,
        totalSavingsPotential,
        overallPerformance: this.getOverallPerformance(totalUserSpending, totalBenchmarkSpending),
        location: userLocation,
        city: userCity,
        benchmark_source: this.getBenchmarkMetadata()
      }
    };
  }

  /**
   * Get overall performance rating
   * @param {number} totalUser - Total user spending
   * @param {number} totalBenchmark - Total benchmark spending
   * @returns {Object} Overall performance
   */
  getOverallPerformance(totalUser, totalBenchmark) {
    const performance = this.getPerformanceRating(totalUser, totalBenchmark);
    return {
      ...performance,
      message: `Your total spending is ${performance.performance} compared to Australian averages`
    };
  }

  /**
   * Fallback benchmarks if ABS data unavailable
   */
  getFallbackBenchmarks() {
    console.warn('⚠️  Using fallback benchmarks - ABS data unavailable');
    return {
      metadata: {
        source: "Fallback estimates",
        last_updated: new Date().toISOString(),
        period: "Estimated",
        notes: "Emergency fallback data - not from official ABS sources"
      },
      australia: {
        'GROCERIES': { amount: 600, description: 'Estimated grocery spending' },
        'DINING_OUT': { amount: 400, description: 'Estimated dining spending' },
        'TRANSPORT_FUEL': { amount: 300, description: 'Estimated fuel spending' }
      },
      performance_thresholds: {
        excellent: 0.7,
        good: 0.9,
        average: 1.1,
        high: 1.3
      }
    };
  }

  /**
   * Fallback performance calculation
   */
  getFallbackPerformance(userSpending, benchmark) {
    const ratio = userSpending / benchmark;
    if (ratio <= 0.8) return { performance: 'excellent', percentile: 25, ratio, message: 'Excellent spending' };
    if (ratio <= 1.0) return { performance: 'good', percentile: 50, ratio, message: 'Good spending' };
    if (ratio <= 1.2) return { performance: 'average', percentile: 75, ratio, message: 'Average spending' };
    return { performance: 'high', percentile: 90, ratio, message: 'High spending' };
  }
}

module.exports = BenchmarkService;