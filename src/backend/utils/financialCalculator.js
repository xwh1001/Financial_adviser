const CustomCategoryManager = require('./customCategories');

class FinancialCalculator {
    constructor(database = null) {
        this.database = database;
        this.customCategoryManager = new CustomCategoryManager();
        this.categories = {}; // Will be loaded from JSON file
        // Initialize custom categories
        this.init();
    }

    async init() {
        try {
            await this.customCategoryManager.init();
            // Load custom categories to replace default ones
            this.categories = await this.customCategoryManager.getCustomCategories();
        } catch (error) {
            console.error('Error initializing custom categories:', error);
        }
    }

    async refreshCategories() {
        try {
            this.categories = await this.customCategoryManager.getCustomCategories();
            if (process.env.NODE_ENV !== 'production') {
                console.log('Categories refreshed. Available categories:', Object.keys(this.categories));
                console.log('Sample category details:', Object.entries(this.categories).slice(0, 3).map(([name, keywords]) => 
                    `${name}: [${keywords.slice(0, 3).join(', ')}...]`
                ));
            }
        } catch (error) {
            console.error('Error refreshing custom categories:', error);
        }
    }

    async categorizeTransaction(description) {
        const desc = description.toUpperCase();
        
        // Create a priority-based rule system
        const allRules = [];
        
        // 1. Database rules (highest priority: 1-99)
        if (this.database) {
            try {
                const dbRules = await this.database.getCategoryRules();
                for (const rule of dbRules) {
                    if (rule.enabled) {
                        allRules.push({
                            priority: rule.priority || 50,
                            pattern: rule.pattern.toUpperCase(),
                            category: rule.category,
                            type: 'database'
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading database category rules:', error);
            }
        }
        
        // 2. Get custom categories and default categories
        let customCategories = this.categories;
        let defaultCategories = this.customCategoryManager.getDefaultCategories();
        
        try {
            customCategories = await this.customCategoryManager.getCustomCategories();
        } catch (error) {
            console.error('Error loading custom categories for transaction:', error);
        }
        
        // 3. Add custom category rules (medium priority: 100-999)
        // Custom categories that differ from defaults get higher priority
        for (const [category, keywords] of Object.entries(customCategories)) {
            const defaultKeywords = defaultCategories[category] || [];
            
            for (const keyword of keywords) {
                const isCustomKeyword = !defaultKeywords.includes(keyword);
                const priority = isCustomKeyword ? 200 : 1000; // Custom keywords get priority 200, default gets 1000
                
                allRules.push({
                    priority: priority,
                    pattern: keyword,
                    category: category,
                    type: isCustomKeyword ? 'custom' : 'default'
                });
            }
        }
        
        // 4. Sort rules by priority (lower number = higher priority)
        allRules.sort((a, b) => a.priority - b.priority);
        
        // 5. Apply rules in priority order
        for (const rule of allRules) {
            if (desc.includes(rule.pattern)) {
                // Only log in development
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Transaction "${desc}" matched category "${rule.category}" via ${rule.type} keyword "${rule.pattern}" (priority: ${rule.priority})`);
                }
                return rule.category;
            }
        }
        
        return 'OTHER';
    }

    async calculateMonthlyData(parsedData) {
        const monthlyData = {};
        const incomeData = [];
        
        // First pass: collect all income data and initialize monthly data structure
        parsedData.forEach(fileData => {
            if (fileData.fileType === 'payslip' && fileData.data.grossPay) {
                const payDate = fileData.data.payPeriod?.end || fileData.parseDate;
                const date = new Date(payDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                const incomeRecord = {
                    date: payDate,
                    monthKey: monthKey,
                    grossPay: fileData.data.grossPay,
                    netPay: fileData.data.netPay,
                    tax: fileData.data.tax,
                    superannuation: fileData.data.superannuation
                };
                
                incomeData.push(incomeRecord);
                
                // Initialize monthly data if not exists
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalIncome: 0,
                        totalExpenses: 0,
                        netSavings: 0,
                        savingsRate: 0,
                        categories: {},
                        transactionCount: 0,
                        transactions: []
                    };
                }
                
                // Add income to monthly data (use Net Pay as actual take-home income)
                monthlyData[monthKey].totalIncome += fileData.data.netPay;
            }
        });
        
        // Second pass: process transactions
        for (const fileData of parsedData) {
            if ((fileData.fileType === 'amex' || fileData.fileType === 'citi') && fileData.data.transactions) {
                for (const transaction of fileData.data.transactions) {
                    const date = new Date(transaction.date);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    
                    // Initialize monthly data if not exists (for months with transactions but no income)
                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = {
                            month: monthKey,
                            totalIncome: 0,
                            totalExpenses: 0,
                            netSavings: 0,
                            savingsRate: 0,
                            categories: {},
                            transactionCount: 0,
                            transactions: []
                        };
                    }
                    
                    const category = await this.categorizeTransaction(transaction.description);
                    
                    monthlyData[monthKey].totalExpenses += transaction.amount;
                    monthlyData[monthKey].categories[category] = (monthlyData[monthKey].categories[category] || 0) + transaction.amount;
                    monthlyData[monthKey].transactionCount++;
                    monthlyData[monthKey].transactions.push({
                        ...transaction,
                        category
                    });
                }
            }
        }
        
        // Third pass: calculate savings and savings rate for each month
        Object.values(monthlyData).forEach(month => {
            month.netSavings = month.totalIncome - month.totalExpenses;
            month.savingsRate = month.totalIncome > 0 ? (month.netSavings / month.totalIncome) * 100 : 0;
        });

        return { monthlyData: Object.values(monthlyData), incomeData };
    }

    calculateYTDSummary(monthlyData, incomeData) {
        const currentYear = new Date().getFullYear();
        const ytdMonths = monthlyData.filter(month => month.month.startsWith(currentYear.toString()));
        
        const totalExpenses = ytdMonths.reduce((sum, month) => sum + month.totalExpenses, 0);
        const totalIncome = incomeData
            .filter(income => new Date(income.date).getFullYear() === currentYear)
            .reduce((sum, income) => sum + (income.netPay || 0), 0);
        
        const netSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
        
        // Category breakdown
        const categoryTotals = {};
        ytdMonths.forEach(month => {
            Object.entries(month.categories).forEach(([category, amount]) => {
                categoryTotals[category] = (categoryTotals[category] || 0) + amount;
            });
        });

        return {
            period: `${currentYear} YTD`,
            monthsIncluded: ytdMonths.length,
            totalIncome,
            totalExpenses,
            netSavings,
            savingsRate,
            monthlyAverageIncome: totalIncome / Math.max(1, ytdMonths.length),
            monthlyAverageExpenses: totalExpenses / Math.max(1, ytdMonths.length),
            categoryBreakdown: Object.entries(categoryTotals)
                .map(([category, amount]) => ({
                    category,
                    amount,
                    percentage: (amount / totalExpenses) * 100
                }))
                .sort((a, b) => b.amount - a.amount)
        };
    }

    async regenerateMonthlySummariesFromDB() {
        console.log('🔄 Regenerating monthly summaries from existing database data...');
        
        if (!this.database) {
            throw new Error('Database connection required for regenerating summaries');
        }
        
        // Get all transactions and income from database
        const ytdData = await this.database.getYTDSummary();
        const transactions = ytdData.transactions || [];
        const incomeRecords = ytdData.income || [];
        
        console.log(`Found ${transactions.length} transactions and ${incomeRecords.length} income records`);
        
        const monthlyData = {};
        
        // Process income records first
        incomeRecords.forEach(income => {
            const date = new Date(income.pay_period_end);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    totalIncome: 0,
                    totalExpenses: 0,
                    netSavings: 0,
                    savingsRate: 0,
                    categories: {},
                    transactionCount: 0
                };
            }
            
            // Use net_pay as the actual income
            monthlyData[monthKey].totalIncome += income.net_pay || 0;
            
            console.log(`Added income for ${monthKey}: $${income.net_pay}`);
        });
        
        // Process transactions
        for (const transaction of transactions) {
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    totalIncome: 0,
                    totalExpenses: 0,
                    netSavings: 0,
                    savingsRate: 0,
                    categories: {},
                    transactionCount: 0
                };
            }
            
            const category = transaction.category || 'OTHER';
            
            monthlyData[monthKey].totalExpenses += transaction.amount;
            monthlyData[monthKey].categories[category] = (monthlyData[monthKey].categories[category] || 0) + transaction.amount;
            monthlyData[monthKey].transactionCount++;
        }
        
        // Calculate savings and savings rate for each month
        Object.values(monthlyData).forEach(month => {
            month.netSavings = month.totalIncome - month.totalExpenses;
            month.savingsRate = month.totalIncome > 0 ? (month.netSavings / month.totalIncome) * 100 : 0;
        });
        
        // Save all monthly summaries to database
        const summaryCount = Object.values(monthlyData).length;
        console.log(`Saving ${summaryCount} monthly summaries to database...`);
        
        for (const monthData of Object.values(monthlyData)) {
            await this.database.saveMonthlySummary(monthData);
            console.log(`Saved summary for ${monthData.month}: Income $${monthData.totalIncome.toFixed(2)}, Expenses $${monthData.totalExpenses.toFixed(2)}`);
        }
        
        console.log('✅ Monthly summaries regeneration complete');
        return Object.values(monthlyData);
    }

    calculateProjections(ytdSummary, targetSavings = 117000) {
        const { savingsRate, monthlyAverageIncome, netSavings } = ytdSummary;
        const monthlySavings = netSavings / Math.max(1, ytdSummary.monthsIncluded);
        
        const scenarios = [
            {
                name: 'Current Rate',
                monthlySavings,
                annualSavings: monthlySavings * 12,
                yearsToTarget: targetSavings / Math.max(1, monthlySavings * 12),
                changes: 'No changes - maintain current spending pattern'
            },
            {
                name: 'Optimized Spending',
                monthlySavings: monthlySavings * 1.3,
                annualSavings: monthlySavings * 1.3 * 12,
                yearsToTarget: targetSavings / Math.max(1, monthlySavings * 1.3 * 12),
                changes: 'Reduce discretionary spending by 20%'
            },
            {
                name: 'With Tax Optimization',
                monthlySavings: monthlySavings + 677,
                annualSavings: (monthlySavings + 677) * 12,
                yearsToTarget: targetSavings / Math.max(1, (monthlySavings + 677) * 12),
                changes: 'Salary sacrifice $25k to super + spending optimization'
            }
        ];

        return scenarios;
    }

    generateInsights(ytdSummary, monthlyData) {
        const insights = [];
        const { categoryBreakdown, savingsRate, monthlyAverageExpenses } = ytdSummary;
        
        // Savings rate insight
        if (savingsRate < 20) {
            insights.push(`Low savings rate of ${savingsRate.toFixed(1)}% - consider reducing discretionary spending`);
        } else if (savingsRate > 30) {
            insights.push(`Excellent savings rate of ${savingsRate.toFixed(1)}% - on track for financial goals`);
        }
        
        // Category insights
        const topCategory = categoryBreakdown[0];
        if (topCategory && topCategory.percentage > 30) {
            insights.push(`${topCategory.category} represents ${topCategory.percentage.toFixed(1)}% of spending - major optimization opportunity`);
        }
        
        // Trend analysis
        if (monthlyData.length >= 3) {
            const recentMonths = monthlyData.slice(-3);
            const trend = recentMonths[2].totalExpenses - recentMonths[0].totalExpenses;
            if (trend > monthlyAverageExpenses * 0.1) {
                insights.push('Spending has increased in recent months - review budget adherence');
            } else if (trend < -monthlyAverageExpenses * 0.1) {
                insights.push('Spending has decreased in recent months - great progress!');
            }
        }
        
        return insights;
    }
}

module.exports = FinancialCalculator;