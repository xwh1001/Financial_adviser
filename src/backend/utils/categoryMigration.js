const fs = require('fs-extra');
const path = require('path');

/**
 * Category Migration Utility
 * Migrates user data from old Australian-style categories to COICOP-aligned categories
 */
class CategoryMigration {
    constructor(database) {
        this.db = database;
        this.backupDir = path.join(__dirname, '../../../data/migration_backup');
        this.migrationLog = [];
        
        // Define comprehensive mapping from old categories to new COICOP categories
        this.categoryMapping = {
            // Direct 1:1 mappings
            'GROCERIES': 'FOOD_GROCERIES',
            'TRANSPORT_PUBLIC': 'TRANSPORT_PUBLIC',
            'TRANSPORT_FUEL': 'TRANSPORT_FUEL', 
            'TRANSPORT_RIDESHARE': 'TRANSPORT_RIDESHARE',
            'TRANSPORT_PARKING': 'TRANSPORT_PARKING',
            'TRANSPORT_OTHER': 'TRANSPORT_REGISTRATION',
            'SHOPPING_ELECTRONICS': 'HOUSEHOLD_APPLIANCES',
            'SHOPPING_ONLINE': 'SHOPPING_ONLINE',
            'UTILITIES_ENERGY': 'UTILITIES_ELECTRICITY', // Will use keyword splitting for gas
            'UTILITIES_WATER': 'UTILITIES_WATER',
            'UTILITIES_COUNCIL': 'GOVERNMENT',
            'HEALTH_MEDICAL': 'HEALTH_MEDICAL',
            'HEALTH_PHARMACY': 'HEALTH_PHARMACY',
            'HEALTH_FITNESS': 'RECREATION_SPORTS',
            'BANKING_FEES': 'FINANCIAL_SERVICES',
            'INSURANCE': 'INSURANCE_GENERAL',
            'INVESTMENTS': 'INVESTMENTS',
            'HOUSING_RENT': 'HOUSING_RENT',
            'HOUSING_MORTGAGE': 'HOUSING_MORTGAGE',
            'HOUSING_MAINTENANCE': 'HOUSING_MAINTENANCE',
            'GOVERNMENT': 'GOVERNMENT',
            'PROFESSIONAL_SERVICES': 'PROFESSIONAL_SERVICES',
            'EDUCATION': 'EDUCATION_TUITION',
            'PERSONAL_CARE': 'PERSONAL_CARE',
            'CHILDCARE': 'CHILDCARE',
            'PETS': 'PETS',
            'TRANSFERS': 'TRANSFERS',
            'CASH_WITHDRAWAL': 'CASH_WITHDRAWAL',
            
            // Categories that require keyword-based splitting
            'DINING_OUT': {
                type: 'split',
                default: 'DINING_RESTAURANTS',
                rules: [
                    { keywords: ['MCDONALD', 'KFC', 'SUBWAY', 'HUNGRY', 'DOMINO', 'PIZZA', 'BURGER', 'TAKEAWAY', 'FAST FOOD'], category: 'DINING_TAKEAWAY' },
                    { keywords: ['CAFE', 'COFFEE', 'STARBUCKS', 'GLORIA JEAN'], category: 'DINING_CAFES' },
                    { keywords: ['PUB', 'BAR', 'GRILL', 'BBQ', 'ROAST', 'TAVERN'], category: 'DINING_PUBS' },
                    { keywords: ['SUSHI', 'THAI', 'CHINESE', 'INDIAN', 'JAPANESE', 'VIETNAMESE', 'MEXICAN', 'ITALIAN'], category: 'DINING_ETHNIC' }
                ]
            },
            
            'SHOPPING_CLOTHING': {
                type: 'split',
                default: 'CLOTHING_APPAREL',
                rules: [
                    { keywords: ['SHOES', 'BOOTS', 'SANDALS', 'SNEAKERS', 'FOOTWEAR', 'ATHLETE FOOT'], category: 'CLOTHING_FOOTWEAR' }
                ]
            },
            
            'SHOPPING_HOME': {
                type: 'split', 
                default: 'HOUSEHOLD_SUPPLIES',
                rules: [
                    { keywords: ['IKEA', 'FANTASTIC', 'FURNITURE', 'SOFA', 'BED', 'TABLE', 'CHAIR'], category: 'HOUSEHOLD_FURNITURE' }
                ]
            },
            
            'UTILITIES_TELECOM': {
                type: 'split',
                default: 'COMMUNICATION_INTERNET',
                rules: [
                    { keywords: ['MOBILE', 'PHONE BILL', 'PREPAID', 'TELSTRA', 'OPTUS', 'VODAFONE'], category: 'COMMUNICATION_MOBILE' },
                    { keywords: ['AUSTRALIA POST', 'POSTAL', 'POSTAGE', 'COURIER', 'DELIVERY'], category: 'COMMUNICATION_POSTAL' }
                ]
            },
            
            'ENTERTAINMENT_STREAMING': 'RECREATION_STREAMING',
            'ENTERTAINMENT_ACTIVITIES': 'RECREATION_ENTERTAINMENT',
            'ENTERTAINMENT_GAMING': 'RECREATION_GAMING',
            'ENTERTAINMENT_TRAVEL': 'RECREATION_TRAVEL'
        };
        
        // Keywords for energy utility splitting
        this.gasKeywords = ['GAS', 'NATURAL GAS', 'LPG'];
    }

    /**
     * Run complete migration process
     */
    async runMigration() {
        try {
            console.log('🚀 Starting Category Migration to COICOP');
            console.log('='.repeat(60));
            
            // Phase 1: Backup
            await this.createBackup();
            
            // Phase 2: Analyze current data
            const analysis = await this.analyzeCurrentData();
            this.logMigration('ANALYSIS', analysis);
            
            // Phase 3: Migrate transactions
            await this.migrateTransactions();
            
            // Phase 4: Migrate category rules
            await this.migrateCategoryRules();
            
            // Phase 5: Migrate user overrides
            await this.migrateUserOverrides();
            
            // Phase 6: Clear cached data
            await this.clearCachedData();
            
            // Phase 7: Generate migration report
            const report = await this.generateMigrationReport();
            
            console.log('\n✅ Migration completed successfully!');
            console.log('📊 Migration Report:');
            console.log(JSON.stringify(report, null, 2));
            
            return {
                success: true,
                report,
                migrationLog: this.migrationLog
            };
            
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            console.log('🔄 Rolling back changes...');
            await this.rollback();
            throw error;
        }
    }

    /**
     * Create backup of all data before migration
     */
    async createBackup() {
        console.log('💾 Creating backup...');
        
        await fs.ensureDir(this.backupDir);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Backup database tables
        if (this.db) {
            const transactions = await this.db.getAllTransactions();
            const categoryRules = await this.db.getCategoryRules();
            const monthlyData = await this.db.getMonthlyData();
            
            await fs.writeJson(path.join(this.backupDir, `transactions_${timestamp}.json`), transactions);
            await fs.writeJson(path.join(this.backupDir, `category_rules_${timestamp}.json`), categoryRules);
            await fs.writeJson(path.join(this.backupDir, `monthly_data_${timestamp}.json`), monthlyData);
            
            this.logMigration('BACKUP', `Database tables backed up to ${this.backupDir}`);
        }
        
        // Backup configuration files
        const configFiles = [
            '../../../data/custom_categories.json',
            '../../../data/default_categories.json',
            '../../../data/father_categories.json'
        ];
        
        for (const configFile of configFiles) {
            const filePath = path.join(__dirname, configFile);
            if (await fs.pathExists(filePath)) {
                const backupPath = path.join(this.backupDir, `${path.basename(configFile, '.json')}_${timestamp}.json`);
                await fs.copy(filePath, backupPath);
                this.logMigration('BACKUP', `Config file backed up: ${configFile}`);
            }
        }
        
        console.log(`✅ Backup created in ${this.backupDir}`);
    }

    /**
     * Analyze current data to understand migration scope
     */
    async analyzeCurrentData() {
        console.log('🔍 Analyzing current data...');
        
        const analysis = {
            transactions: 0,
            categoryRules: 0,
            userOverrides: 0,
            categoriesInUse: new Set(),
            migrationMapping: {}
        };
        
        if (this.db) {
            // Analyze transactions
            const transactions = await this.db.getAllTransactions();
            analysis.transactions = transactions.length;
            
            transactions.forEach(txn => {
                if (txn.category) {
                    analysis.categoriesInUse.add(txn.category);
                }
            });
            
            // Analyze category rules
            const rules = await this.db.getCategoryRules();
            analysis.categoryRules = rules.length;
            
            rules.forEach(rule => {
                if (rule.category) {
                    analysis.categoriesInUse.add(rule.category);
                }
            });
            
            // Create migration mapping for found categories
            Array.from(analysis.categoriesInUse).forEach(oldCategory => {
                const newCategory = this.mapCategory(oldCategory, 'SAMPLE DESCRIPTION');
                analysis.migrationMapping[oldCategory] = newCategory;
            });
        }
        
        analysis.categoriesInUse = Array.from(analysis.categoriesInUse);
        
        console.log(`📊 Found ${analysis.transactions} transactions, ${analysis.categoryRules} rules`);
        console.log(`📋 Categories in use: ${analysis.categoriesInUse.length}`);
        
        return analysis;
    }

    /**
     * Migrate all transaction records
     */
    async migrateTransactions() {
        console.log('🔄 Migrating transactions...');
        
        if (!this.db) {
            this.logMigration('WARNING', 'No database connection, skipping transaction migration');
            return;
        }
        
        const transactions = await this.db.getAllTransactions();
        let migratedCount = 0;
        
        for (const transaction of transactions) {
            if (transaction.category) {
                const oldCategory = transaction.category;
                const newCategory = this.mapCategory(oldCategory, transaction.description || '');
                
                if (oldCategory !== newCategory) {
                    // Update transaction category
                    await this.db.updateTransactionCategory(transaction.id, newCategory);
                    migratedCount++;
                    
                    this.logMigration('TRANSACTION_MIGRATION', {
                        id: transaction.id,
                        description: transaction.description,
                        oldCategory,
                        newCategory
                    });
                }
            }
        }
        
        console.log(`✅ Migrated ${migratedCount} transactions`);
        this.logMigration('SUMMARY', `Migrated ${migratedCount} of ${transactions.length} transactions`);
    }

    /**
     * Migrate category rules
     */
    async migrateCategoryRules() {
        console.log('🔄 Migrating category rules...');
        
        if (!this.db) {
            this.logMigration('WARNING', 'No database connection, skipping rule migration');
            return;
        }
        
        const rules = await this.db.getCategoryRules();
        let migratedCount = 0;
        
        for (const rule of rules) {
            if (rule.category) {
                const oldCategory = rule.category;
                const newCategory = this.mapCategory(oldCategory, rule.pattern || '');
                
                if (oldCategory !== newCategory) {
                    // Update rule category
                    await this.db.updateCategoryRule(rule.id, { category: newCategory });
                    migratedCount++;
                    
                    this.logMigration('RULE_MIGRATION', {
                        id: rule.id,
                        pattern: rule.pattern,
                        oldCategory,
                        newCategory
                    });
                }
            }
        }
        
        console.log(`✅ Migrated ${migratedCount} category rules`);
        this.logMigration('SUMMARY', `Migrated ${migratedCount} of ${rules.length} category rules`);
    }

    /**
     * Migrate user category overrides
     */
    async migrateUserOverrides() {
        console.log('🔄 Migrating user overrides...');
        
        if (!this.db) {
            this.logMigration('WARNING', 'No database connection, skipping override migration');
            return;
        }
        
        // This would need to be implemented based on how user overrides are stored
        // For now, we'll just log that this step would happen
        this.logMigration('INFO', 'User override migration would happen here if overrides exist');
    }

    /**
     * Clear cached data that needs regeneration
     */
    async clearCachedData() {
        console.log('🧹 Clearing cached data...');
        
        if (this.db) {
            // Clear monthly summaries - they'll be regenerated with new categories
            await this.db.clearMonthlyCache();
            this.logMigration('CACHE_CLEAR', 'Monthly summaries cleared for regeneration');
        }
        
        console.log('✅ Cached data cleared');
    }

    /**
     * Map old category to new COICOP category
     */
    mapCategory(oldCategory, description = '') {
        const mapping = this.categoryMapping[oldCategory];
        
        if (!mapping) {
            // Category not in mapping, assume it's already COICOP or keep as-is
            return oldCategory;
        }
        
        if (typeof mapping === 'string') {
            // Simple 1:1 mapping
            return mapping;
        }
        
        if (mapping.type === 'split') {
            // Keyword-based splitting
            const upperDescription = description.toUpperCase();
            
            for (const rule of mapping.rules) {
                if (rule.keywords.some(keyword => upperDescription.includes(keyword))) {
                    return rule.category;
                }
            }
            
            // No keywords matched, use default
            return mapping.default;
        }
        
        return oldCategory;
    }

    /**
     * Generate migration report
     */
    async generateMigrationReport() {
        console.log('📊 Generating migration report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                categoriesMigrated: 0,
                transactionsMigrated: 0,
                rulesMigrated: 0
            },
            categoryMappings: {},
            issues: []
        };
        
        // Analyze migration log
        this.migrationLog.forEach(entry => {
            if (entry.type === 'TRANSACTION_MIGRATION') {
                report.summary.transactionsMigrated++;
                if (!report.categoryMappings[entry.data.oldCategory]) {
                    report.categoryMappings[entry.data.oldCategory] = {
                        newCategory: entry.data.newCategory,
                        count: 0
                    };
                }
                report.categoryMappings[entry.data.oldCategory].count++;
            } else if (entry.type === 'RULE_MIGRATION') {
                report.summary.rulesMigrated++;
            }
        });
        
        report.summary.categoriesMigrated = Object.keys(report.categoryMappings).length;
        
        // Save report
        const reportPath = path.join(this.backupDir, `migration_report_${Date.now()}.json`);
        await fs.writeJson(reportPath, {
            report,
            migrationLog: this.migrationLog
        }, { spaces: 2 });
        
        this.logMigration('REPORT', `Migration report saved to ${reportPath}`);
        
        return report;
    }

    /**
     * Rollback migration if something goes wrong
     */
    async rollback() {
        console.log('🔄 Rolling back migration...');
        
        try {
            // Find latest backup files
            const backupFiles = await fs.readdir(this.backupDir);
            const latestBackups = {};
            
            ['transactions', 'category_rules', 'monthly_data'].forEach(type => {
                const files = backupFiles.filter(f => f.startsWith(type));
                if (files.length > 0) {
                    latestBackups[type] = files.sort().pop();
                }
            });
            
            // Restore database data
            if (this.db && latestBackups.transactions) {
                const transactions = await fs.readJson(path.join(this.backupDir, latestBackups.transactions));
                await this.db.restoreTransactions(transactions);
                console.log('✅ Transactions restored');
            }
            
            if (this.db && latestBackups.category_rules) {
                const rules = await fs.readJson(path.join(this.backupDir, latestBackups.category_rules));
                await this.db.restoreCategoryRules(rules);
                console.log('✅ Category rules restored');
            }
            
            this.logMigration('ROLLBACK', 'Migration rolled back successfully');
            
        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
            this.logMigration('ERROR', `Rollback failed: ${error.message}`);
        }
    }

    /**
     * Log migration activity
     */
    logMigration(type, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            type,
            data
        };
        
        this.migrationLog.push(entry);
        
        if (type === 'ERROR' || type === 'WARNING') {
            console.log(`${type}: ${JSON.stringify(data)}`);
        }
    }
}

module.exports = CategoryMigration;