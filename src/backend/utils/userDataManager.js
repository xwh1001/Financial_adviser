const fs = require('fs-extra');
const path = require('path');

class UserDataManager {
    constructor(database, customCategoryManager) {
        this.db = database;
        this.customCategoryManager = customCategoryManager;
        this.userDataDir = path.join(__dirname, '../../../user-data');
    }

    async init() {
        // Ensure user-data directory exists
        await fs.ensureDir(this.userDataDir);
    }

    async exportUserData(filename = null) {
        try {
            if (!filename) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                filename = `user-transaction-backup-${timestamp}.json`;
            }

            console.log('📋 Exporting user transaction data...');

            // Collect all user-defined data
            const userData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                data: {
                    // Transaction category overrides (manual changes)
                    categoryOverrides: await this.db.getCategoryOverrides(),
                    
                    // Balance adjustments
                    balanceAdjustments: await this.db.getBalanceAdjustments(),
                    
                    // User settings
                    userSettings: await this.db.getAllUserSettings(),
                    
                    // Custom category rules
                    categoryRules: await this.db.getCategoryRules(),
                    
                    // Custom category definitions
                    customCategories: await this.customCategoryManager.getCustomCategories(),
                    
                    // Father category mappings
                    categoryMappings: await this.loadCategoryMappings()
                }
            };

            const filePath = path.join(this.userDataDir, filename);
            await fs.writeJSON(filePath, userData, { spaces: 2 });

            console.log(`💾 User data exported to: ${filePath}`);
            console.log(`📊 Export summary:`);
            console.log(`   - Category overrides: ${userData.data.categoryOverrides.length}`);
            console.log(`   - Balance adjustments: ${userData.data.balanceAdjustments.length}`);
            console.log(`   - User settings: ${Object.keys(userData.data.userSettings).length}`);
            console.log(`   - Category rules: ${userData.data.categoryRules.length}`);
            console.log(`   - Custom categories: ${Object.keys(userData.data.customCategories).length}`);

            return {
                success: true,
                filePath,
                filename,
                stats: {
                    categoryOverrides: userData.data.categoryOverrides.length,
                    balanceAdjustments: userData.data.balanceAdjustments.length,
                    userSettings: Object.keys(userData.data.userSettings).length,
                    categoryRules: userData.data.categoryRules.length,
                    customCategories: Object.keys(userData.data.customCategories).length
                }
            };

        } catch (error) {
            console.error('❌ Error exporting user data:', error);
            throw error;
        }
    }

    async importUserData(filename) {
        try {
            const filePath = path.join(this.userDataDir, filename);
            
            if (!await fs.pathExists(filePath)) {
                throw new Error(`Backup file not found: ${filename}`);
            }

            console.log(`📥 Importing user data from: ${filePath}`);

            const userData = await fs.readJSON(filePath);
            
            if (!userData.data) {
                throw new Error('Invalid backup file format');
            }

            let importStats = {
                categoryOverrides: 0,
                balanceAdjustments: 0,
                userSettings: 0,
                categoryRules: 0,
                customCategories: 0
            };

            // Import category overrides
            if (userData.data.categoryOverrides) {
                for (const override of userData.data.categoryOverrides) {
                    await this.db.saveCategoryOverride(
                        override.transaction_hash,
                        override.original_category,
                        override.override_category
                    );
                    importStats.categoryOverrides++;
                }
            }

            // Import balance adjustments
            if (userData.data.balanceAdjustments) {
                for (const adjustment of userData.data.balanceAdjustments) {
                    await this.db.addBalanceAdjustment(
                        adjustment.adjustment_date,
                        adjustment.adjustment_type,
                        adjustment.amount,
                        adjustment.description
                    );
                    importStats.balanceAdjustments++;
                }
            }

            // Import user settings
            if (userData.data.userSettings) {
                for (const [key, value] of Object.entries(userData.data.userSettings)) {
                    await this.db.setUserSetting(key, value);
                    importStats.userSettings++;
                }
            }

            // Import category rules
            if (userData.data.categoryRules) {
                for (const rule of userData.data.categoryRules) {
                    await this.db.saveCategoryRule(rule.pattern, rule.category, rule.priority);
                    importStats.categoryRules++;
                }
            }

            // Import custom categories
            if (userData.data.customCategories) {
                for (const [categoryName, keywords] of Object.entries(userData.data.customCategories)) {
                    await this.customCategoryManager.addCategory(categoryName, keywords);
                    importStats.customCategories++;
                }
            }

            console.log(`✅ User data imported successfully`);
            console.log(`📊 Import summary:`);
            console.log(`   - Category overrides: ${importStats.categoryOverrides}`);
            console.log(`   - Balance adjustments: ${importStats.balanceAdjustments}`);
            console.log(`   - User settings: ${importStats.userSettings}`);
            console.log(`   - Category rules: ${importStats.categoryRules}`);
            console.log(`   - Custom categories: ${importStats.customCategories}`);

            return {
                success: true,
                stats: importStats
            };

        } catch (error) {
            console.error('❌ Error importing user data:', error);
            throw error;
        }
    }

    async loadCategoryMappings() {
        try {
            const mappingPath = path.join(__dirname, '../../../data/category_mapping.json');
            if (await fs.pathExists(mappingPath)) {
                return await fs.readJSON(mappingPath);
            }
            return {};
        } catch (error) {
            console.log('No category mappings found');
            return {};
        }
    }

    async listBackups() {
        try {
            const files = await fs.readdir(this.userDataDir);
            const backupFiles = files.filter(file => 
                file.startsWith('user-transaction-backup-') && file.endsWith('.json')
            );

            const backups = [];
            for (const file of backupFiles) {
                const filePath = path.join(this.userDataDir, file);
                const stats = await fs.stat(filePath);
                const userData = await fs.readJSON(filePath);
                
                backups.push({
                    filename: file,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    exportDate: userData.exportDate,
                    version: userData.version || '1.0',
                    stats: {
                        categoryOverrides: userData.data?.categoryOverrides?.length || 0,
                        balanceAdjustments: userData.data?.balanceAdjustments?.length || 0,
                        userSettings: Object.keys(userData.data?.userSettings || {}).length,
                        categoryRules: userData.data?.categoryRules?.length || 0,
                        customCategories: Object.keys(userData.data?.customCategories || {}).length
                    }
                });
            }

            return backups.sort((a, b) => new Date(b.created) - new Date(a.created));

        } catch (error) {
            console.error('Error listing backups:', error);
            return [];
        }
    }

    async deleteBackup(filename) {
        try {
            const filePath = path.join(this.userDataDir, filename);
            await fs.remove(filePath);
            console.log(`🗑️ Deleted backup: ${filename}`);
            return true;
        } catch (error) {
            console.error('Error deleting backup:', error);
            throw error;
        }
    }

    async createAutoBackup() {
        const filename = `auto-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        return await this.exportUserData(filename);
    }
}

module.exports = UserDataManager;