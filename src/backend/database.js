const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const DateFilter = require('./utils/dateFilter');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../../data/financial_dashboard.db');
        this.db = null;
    }

    async init() {
        await fs.ensureDir(path.dirname(this.dbPath));
        
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        // First create tables
        const tables = [
            `CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                account_type TEXT NOT NULL,
                file_source TEXT NOT NULL,
                transaction_hash TEXT UNIQUE,
                type TEXT DEFAULT 'expense',
                offset_amount REAL,
                reference_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS income (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pay_period_start TEXT NOT NULL,
                pay_period_end TEXT NOT NULL,
                gross_pay REAL NOT NULL,
                net_pay REAL NOT NULL,
                tax REAL,
                superannuation REAL,
                file_source TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS monthly_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                month TEXT NOT NULL UNIQUE,
                total_income REAL DEFAULT 0,
                total_expenses REAL DEFAULT 0,
                net_savings REAL DEFAULT 0,
                savings_rate REAL DEFAULT 0,
                transaction_count INTEGER DEFAULT 0,
                category_breakdown TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS parsed_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                file_type TEXT NOT NULL,
                parse_date TEXT NOT NULL,
                status TEXT DEFAULT 'processed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS category_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT NOT NULL,
                category TEXT NOT NULL,
                priority INTEGER DEFAULT 0,
                enabled BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT NOT NULL UNIQUE,
                setting_value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS balance_adjustments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adjustment_date TEXT NOT NULL,
                adjustment_type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS transaction_category_overrides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_hash TEXT NOT NULL UNIQUE,
                original_category TEXT NOT NULL,
                override_category TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }
        
        // Run migrations for existing databases
        await this.runMigrations();
        
        // Add default category rules if none exist
        await this.addDefaultCategoryRules();
    }

    async runMigrations() {
        try {
            // Check if new columns exist, add them if they don't
            const columns = await this.all("PRAGMA table_info(transactions)");
            const columnNames = columns.map(col => col.name);
            
            if (!columnNames.includes('type')) {
                await this.run("ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'expense'");
                console.log('✅ Added type column to transactions table');
            }
            
            if (!columnNames.includes('offset_amount')) {
                await this.run("ALTER TABLE transactions ADD COLUMN offset_amount REAL");
                console.log('✅ Added offset_amount column to transactions table');
            }
            
            if (!columnNames.includes('reference_number')) {
                await this.run("ALTER TABLE transactions ADD COLUMN reference_number TEXT");
                console.log('✅ Added reference_number column to transactions table');
            }
        } catch (error) {
            console.error('Migration error:', error);
        }
    }

    async addDefaultCategoryRules() {
        try {
            const existingRules = await this.getCategoryRules();
            
            if (existingRules.length === 0) {
                const defaultRules = [
                    { pattern: 'WOOLWORTHS', category: 'GROCERIES', priority: 10 },
                    { pattern: 'COLES', category: 'GROCERIES', priority: 10 },
                    { pattern: 'ALDI', category: 'GROCERIES', priority: 10 },
                    { pattern: 'IGA', category: 'GROCERIES', priority: 10 },
                    { pattern: 'MCDONALD', category: 'DINING_OUT', priority: 10 },
                    { pattern: 'KFC', category: 'DINING_OUT', priority: 10 },
                    { pattern: 'UBER EATS', category: 'DINING_OUT', priority: 10 },
                    { pattern: 'DOMINO', category: 'DINING_OUT', priority: 10 },
                    { pattern: 'NETFLIX', category: 'ENTERTAINMENT_STREAMING', priority: 10 },
                    { pattern: 'SPOTIFY', category: 'ENTERTAINMENT_STREAMING', priority: 10 },
                    { pattern: 'SHELL', category: 'TRANSPORT_FUEL', priority: 10 },
                    { pattern: 'BP', category: 'TRANSPORT_FUEL', priority: 10 },
                    { pattern: 'UBER', category: 'TRANSPORT_RIDESHARE', priority: 9 },
                    { pattern: 'BUNNINGS', category: 'SHOPPING_HOME', priority: 10 },
                    { pattern: 'JB HI-FI', category: 'SHOPPING_ELECTRONICS', priority: 10 },
                    { pattern: 'ORIGIN ENERGY', category: 'UTILITIES_ENERGY', priority: 10 },
                    { pattern: 'AGL', category: 'UTILITIES_ENERGY', priority: 10 },
                    { pattern: 'TELSTRA', category: 'UTILITIES_TELECOM', priority: 10 },
                    { pattern: 'OPTUS', category: 'UTILITIES_TELECOM', priority: 10 }
                ];

                for (const rule of defaultRules) {
                    await this.saveCategoryRule(rule.pattern, rule.category, rule.priority);
                }
                
                console.log(`Added ${defaultRules.length} default category rules`);
            }
        } catch (error) {
            console.log('Skipping default rules setup (tables may not exist yet)');
        }
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err.message, { sql, params });
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database get error:', err.message, { sql, params });
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database all error:', err.message, { sql, params });
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async saveTransactions(transactions, fileSource) {
        // Use INSERT OR IGNORE with transaction_hash to handle duplicates
        const insertStmt = `INSERT OR IGNORE INTO transactions 
                           (date, description, amount, category, account_type, file_source, transaction_hash) 
                           VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        let newTransactions = 0;
        let duplicateTransactions = 0;
        
        for (const transaction of transactions) {
            // Create a unique hash for this transaction using absolute amount for consistency
            const transactionHash = this.createTransactionHash(
                transaction.date, 
                transaction.description, 
                Math.abs(transaction.amount), // Use absolute value for hash consistency
                transaction.account_type || 'credit_card'
            );
            
            try {
                const result = await this.run(insertStmt, [
                    transaction.date,
                    transaction.description,
                    transaction.amount,  // Store original amount (can be negative)
                    transaction.category,
                    transaction.account_type || 'credit_card',
                    fileSource,
                    transactionHash
                ]);
                
                if (result.changes > 0) {
                    newTransactions++;
                } else {
                    duplicateTransactions++;
                }
            } catch (error) {
                // This should not happen with INSERT OR IGNORE, but handle gracefully
                console.log(`Skipping duplicate transaction: ${transaction.description} on ${transaction.date}`);
                duplicateTransactions++;
            }
        }
        
        console.log(`💾 Saved ${newTransactions} new transactions, skipped ${duplicateTransactions} duplicates`);
    }

    createTransactionHash(date, description, amount, accountType) {
        const crypto = require('crypto');
        const data = `${date}-${description}-${amount}-${accountType}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    async saveIncome(incomeData, fileSource) {
        // Check if income for this pay period already exists
        const checkStmt = `SELECT COUNT(*) as count FROM income 
                          WHERE pay_period_start = ? AND pay_period_end = ? AND gross_pay = ?`;
        
        const existing = await this.get(checkStmt, [
            incomeData.payPeriod?.start,
            incomeData.payPeriod?.end,
            incomeData.grossPay
        ]);
        
        if (existing.count === 0) {
            const stmt = `INSERT INTO income 
                          (pay_period_start, pay_period_end, gross_pay, net_pay, tax, superannuation, file_source) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            await this.run(stmt, [
                incomeData.payPeriod?.start,
                incomeData.payPeriod?.end,
                incomeData.grossPay,
                incomeData.netPay,
                incomeData.tax,
                incomeData.superannuation,
                fileSource
            ]);
        } else {
            console.log(`Skipping duplicate income: ${incomeData.payPeriod?.start} to ${incomeData.payPeriod?.end} - $${incomeData.grossPay}`);
        }
    }

    async saveMonthlySummary(monthData) {
        const stmt = `INSERT OR REPLACE INTO monthly_summaries 
                      (month, total_income, total_expenses, net_savings, savings_rate, 
                       transaction_count, category_breakdown, updated_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        
        await this.run(stmt, [
            monthData.month,
            monthData.totalIncome || 0,
            monthData.totalExpenses,
            monthData.netSavings || 0,
            monthData.savingsRate || 0,
            monthData.transactionCount,
            JSON.stringify(monthData.categories)
        ]);
    }

    async markFileProcessed(filename, fileType) {
        const stmt = `INSERT OR REPLACE INTO parsed_files (filename, file_type, parse_date) 
                      VALUES (?, ?, ?)`;
        
        await this.run(stmt, [filename, fileType, new Date().toISOString()]);
    }

    async getProcessedFiles() {
        return await this.all('SELECT filename FROM parsed_files');
    }

    async isFileProcessed(filename) {
        const result = await this.get('SELECT COUNT(*) as count FROM parsed_files WHERE filename = ?', [filename]);
        return result.count > 0;
    }

    async clearProcessedFiles() {
        await this.run('DELETE FROM parsed_files');
        console.log('🗑️  Cleared all processed files from database');
    }

    async removeFileProcessed(filename) {
        await this.run('DELETE FROM parsed_files WHERE filename = ?', [filename]);
        console.log(`🗑️  Removed file from processed tracking: ${filename}`);
    }

    async getYTDSummary(year = new Date().getFullYear()) {
        const transactions = await this.all(
            `SELECT * FROM transactions 
             WHERE date LIKE ? 
             ORDER BY date DESC`,
            [`${year}%`]
        );

        const transactionsWithOverrides = await this.applyCategoryOverridesToTransactions(transactions);

        const income = await this.all(
            `SELECT * FROM income 
             WHERE pay_period_end LIKE ? 
             ORDER BY pay_period_end DESC`,
            [`${year}%`]
        );

        const monthlySummaries = await this.all(
            `SELECT * FROM monthly_summaries 
             WHERE month LIKE ? 
             ORDER BY month`,
            [`${year}%`]
        );

        return { transactions: transactionsWithOverrides, income, monthlySummaries };
    }

    async getRecentTransactions(limit = 50) {
        const transactions = await this.all(
            `SELECT * FROM transactions 
             ORDER BY date DESC, created_at DESC 
             LIMIT ?`,
            [limit]
        );
        return await this.applyCategoryOverridesToTransactions(transactions);
    }

    async getTransactionsByCategory(category) {
        // Get transactions that should be in this category considering overrides
        const sql = `
            SELECT DISTINCT t.id, t.date, t.description, t.amount, t.account_type, t.category, t.transaction_hash,
                   COALESCE(o.override_category, t.category) as effective_category
            FROM transactions t
            LEFT JOIN transaction_category_overrides o ON t.transaction_hash = o.transaction_hash
            WHERE COALESCE(o.override_category, t.category) = ?
            ORDER BY t.date DESC
        `;
        const transactions = await this.all(sql, [category]);
        // Update the category field to reflect the effective category
        return transactions.map(t => ({
            ...t,
            category: t.effective_category
        }));
    }

    async getTransactionsByMonths(months) {
        // Use centralized date filtering for consistency
        const { conditions, params } = DateFilter.generateSQLConditions(months, 'date');
        
        const sql = `SELECT * FROM transactions WHERE (${conditions}) ORDER BY date DESC`;
        const transactions = await this.all(sql, params);
        return await this.applyCategoryOverridesToTransactions(transactions);
    }

    async getTransactionsByCategoryAndMonths(category, months) {
        // Use centralized date filtering for consistency
        const { conditions, params: dateParams } = DateFilter.generateSQLConditions(months, 't.date');
        const params = [category, ...dateParams]; // Category first, then date parameters
        
        const sql = `
            SELECT DISTINCT t.id, t.date, t.description, t.amount, t.account_type, t.category, t.transaction_hash,
                   COALESCE(o.override_category, t.category) as effective_category
            FROM transactions t
            LEFT JOIN transaction_category_overrides o ON t.transaction_hash = o.transaction_hash
            WHERE COALESCE(o.override_category, t.category) = ? AND (${conditions})
            ORDER BY t.date DESC
        `;
        const transactions = await this.all(sql, params);
        return transactions.map(t => ({
            ...t,
            category: t.effective_category
        }));
    }

    async updateTransactionCategory(transactionId, newCategory) {
        // First get the transaction to get its hash and original category
        const transaction = await this.get(
            `SELECT transaction_hash, category FROM transactions WHERE id = ?`, 
            [transactionId]
        );
        
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        // Save the category override instead of updating the transaction directly
        return await this.saveCategoryOverride(
            transaction.transaction_hash, 
            transaction.category, 
            newCategory
        );
    }

    async saveCategoryOverride(transactionHash, originalCategory, overrideCategory) {
        const sql = `INSERT OR REPLACE INTO transaction_category_overrides 
                     (transaction_hash, original_category, override_category, updated_at) 
                     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
        return await this.run(sql, [transactionHash, originalCategory, overrideCategory]);
    }

    async getCategoryOverrides() {
        const sql = `SELECT * FROM transaction_category_overrides`;
        return await this.all(sql);
    }

    async deleteCategoryOverride(transactionHash) {
        const sql = `DELETE FROM transaction_category_overrides WHERE transaction_hash = ?`;
        return await this.run(sql, [transactionHash]);
    }

    // Helper method to apply category overrides to transaction results
    async applyCategoryOverridesToTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            return transactions;
        }

        // Get all overrides
        const overrides = await this.getCategoryOverrides();
        const overrideMap = {};
        overrides.forEach(override => {
            overrideMap[override.transaction_hash] = override.override_category;
        });

        // Apply overrides to transactions
        return transactions.map(transaction => ({
            ...transaction,
            category: overrideMap[transaction.transaction_hash] || transaction.category
        }));
    }

    async getAllTransactions() {
        const sql = `SELECT id, description, category, transaction_hash FROM transactions ORDER BY date DESC`;
        return await this.all(sql);
    }

    // Category Rules Management
    async getCategoryRules() {
        const sql = `SELECT * FROM category_rules WHERE enabled = 1 ORDER BY priority DESC, id ASC`;
        return await this.all(sql);
    }

    async saveCategoryRule(pattern, category, priority = 0) {
        const sql = `INSERT INTO category_rules (pattern, category, priority) VALUES (?, ?, ?)`;
        return await this.run(sql, [pattern, category, priority]);
    }

    async updateCategoryRule(id, pattern, category, priority, enabled) {
        const sql = `UPDATE category_rules 
                     SET pattern = ?, category = ?, priority = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        return await this.run(sql, [pattern, category, priority, enabled ? 1 : 0, id]);
    }

    async deleteCategoryRule(id) {
        const sql = `DELETE FROM category_rules WHERE id = ?`;
        return await this.run(sql, [id]);
    }

    async getAllCategoryRules() {
        const sql = `SELECT * FROM category_rules ORDER BY priority DESC, id ASC`;
        return await this.all(sql);
    }

    async getCategoryRuleByPattern(pattern) {
        const sql = `SELECT * FROM category_rules WHERE pattern = ? LIMIT 1`;
        return await this.get(sql, [pattern]);
    }

    // User Settings Management
    async getUserSetting(key) {
        const sql = `SELECT setting_value FROM user_settings WHERE setting_key = ?`;
        const result = await this.get(sql, [key]);
        return result ? result.setting_value : null;
    }

    async setUserSetting(key, value) {
        const sql = `INSERT OR REPLACE INTO user_settings (setting_key, setting_value, updated_at) 
                     VALUES (?, ?, CURRENT_TIMESTAMP)`;
        return await this.run(sql, [key, JSON.stringify(value)]);
    }

    async getAllUserSettings() {
        const sql = `SELECT setting_key, setting_value FROM user_settings`;
        const results = await this.all(sql);
        const settings = {};
        results.forEach(row => {
            try {
                settings[row.setting_key] = JSON.parse(row.setting_value);
            } catch (e) {
                settings[row.setting_key] = row.setting_value;
            }
        });
        return settings;
    }

    // Category trend analysis methods
    async getCategoryMonthlyTrends(category, startDate = null, endDate = null) {
        let sql = `
            SELECT 
                strftime('%Y-%m', datetime(t.date, '+10 hours')) as month,
                SUM(t.amount) as amount,
                COUNT(*) as transaction_count
            FROM transactions t
            LEFT JOIN transaction_category_overrides o ON t.transaction_hash = o.transaction_hash
            WHERE COALESCE(o.override_category, t.category) = ?
        `;
        
        const params = [category];
        
        // Add timezone-aware date filtering if provided
        if (startDate && endDate) {
            sql += ` AND t.date >= ? AND t.date <= ?`;
            params.push(startDate, endDate);
        }
        
        sql += ` GROUP BY strftime('%Y-%m', datetime(t.date, '+10 hours')) ORDER BY month`;
        
        return await this.all(sql, params);
    }

    async getTransactionsByCategories(categories, startDate = null, endDate = null) {
        if (!categories || categories.length === 0) {
            return [];
        }
        
        const placeholders = categories.map(() => '?').join(',');
        let sql = `
            SELECT DISTINCT t.id, t.date, t.description, t.amount, t.category, t.account_type, t.file_source, t.transaction_hash,
                   COALESCE(o.override_category, t.category) as effective_category
            FROM transactions t
            LEFT JOIN transaction_category_overrides o ON t.transaction_hash = o.transaction_hash
            WHERE COALESCE(o.override_category, t.category) IN (${placeholders})
        `;
        
        const params = [...categories];
        
        // Add timezone-aware date filtering if provided
        if (startDate && endDate) {
            sql += ` AND t.date >= ? AND t.date <= ?`;
            params.push(startDate, endDate);
        }
        
        sql += ` ORDER BY t.date DESC`;
        
        const transactions = await this.all(sql, params);
        return transactions.map(t => ({
            ...t,
            category: t.effective_category
        }));
    }

    // Balance Adjustments Management
    async getBalanceAdjustments() {
        const sql = `SELECT * FROM balance_adjustments ORDER BY adjustment_date DESC`;
        return await this.all(sql);
    }

    async addBalanceAdjustment(adjustmentDate, adjustmentType, amount, description = null) {
        const sql = `INSERT INTO balance_adjustments (adjustment_date, adjustment_type, amount, description) 
                     VALUES (?, ?, ?, ?)`;
        return await this.run(sql, [adjustmentDate, adjustmentType, amount, description]);
    }

    async deleteBalanceAdjustment(id) {
        const sql = `DELETE FROM balance_adjustments WHERE id = ?`;
        return await this.run(sql, [id]);
    }

    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error(err.message);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;