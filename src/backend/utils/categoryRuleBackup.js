const fs = require('fs-extra');
const path = require('path');

class CategoryRuleBackupManager {
    constructor(database, customCategoryManager) {
        this.db = database;
        this.customCategoryManager = customCategoryManager;
        this.backupDir = path.join(__dirname, '../../../user-data');
        this.defaultBackupFile = path.join(this.backupDir, 'category-rules-backup.json');
    }

    /**
     * Export all category rules and custom categories to JSON
     */
    async exportRules(filePath = null) {
        try {
            const outputPath = filePath || this.defaultBackupFile;
            
            // Ensure backup directory exists
            await fs.ensureDir(this.backupDir);

            // Get all category rules from database
            const categoryRules = await this.db.getAllCategoryRules();
            
            // Get all category overrides (manual transaction category changes)
            const categoryOverrides = await this.db.getCategoryOverrides();
            
            // Get custom categories from the manager
            const customCategories = this.customCategoryManager.getCategories();

            // Create backup structure
            const backup = {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    version: "1.1.0", // Bumped version to include category overrides
                    description: "Financial Adviser Category Rules and Overrides Backup",
                    totalRules: categoryRules.length,
                    totalCustomCategories: Object.keys(customCategories).length,
                    totalCategoryOverrides: categoryOverrides.length,
                    appVersion: process.env.npm_package_version || "unknown"
                },
                categoryRules: categoryRules.map(rule => ({
                    pattern: rule.pattern,
                    category: rule.category,
                    priority: rule.priority,
                    enabled: Boolean(rule.enabled),
                    notes: rule.notes || `Exported rule for ${rule.pattern}`,
                    originalId: rule.id // Keep for reference
                })),
                categoryOverrides: categoryOverrides.map(override => ({
                    transactionHash: override.transaction_hash,
                    originalCategory: override.original_category,
                    overrideCategory: override.override_category,
                    updatedAt: override.updated_at
                })),
                customCategories: customCategories,
                settings: {
                    autoBackup: true,
                    backupFrequency: "weekly",
                    lastBackup: new Date().toISOString()
                }
            };

            // Write to file
            await fs.writeJSON(outputPath, backup, { spaces: 2 });

            console.log(`✅ Category rules and overrides exported to: ${outputPath}`);
            console.log(`📊 Exported ${backup.metadata.totalRules} rules, ${backup.metadata.totalCategoryOverrides} overrides, and ${backup.metadata.totalCustomCategories} custom categories`);

            return {
                success: true,
                filePath: outputPath,
                rulesCount: backup.metadata.totalRules,
                overridesCount: backup.metadata.totalCategoryOverrides,
                categoriesCount: backup.metadata.totalCustomCategories
            };

        } catch (error) {
            console.error('❌ Error exporting category rules:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Import category rules from JSON file
     */
    async importRules(filePath = null, options = {}) {
        try {
            const inputPath = filePath || this.defaultBackupFile;
            const { replaceExisting = false, validateOnly = false } = options;

            // Check if file exists
            if (!await fs.pathExists(inputPath)) {
                throw new Error(`Backup file not found: ${inputPath}`);
            }

            // Read and parse JSON
            const backup = await fs.readJSON(inputPath);
            
            // Validate backup structure
            this.validateBackupStructure(backup);

            if (validateOnly) {
                return {
                    success: true,
                    valid: true,
                    rulesCount: backup.categoryRules?.length || 0,
                    categoriesCount: Object.keys(backup.customCategories || {}).length
                };
            }

            let importStats = {
                rulesImported: 0,
                rulesSkipped: 0,
                rulesUpdated: 0,
                overridesImported: 0,
                overridesSkipped: 0,
                categoriesImported: 0,
                errors: []
            };

            // Import category rules
            if (backup.categoryRules && backup.categoryRules.length > 0) {
                if (replaceExisting) {
                    // Clear existing rules first
                    await this.clearAllCategoryRules();
                }

                for (const rule of backup.categoryRules) {
                    try {
                        // Check if rule already exists
                        const existingRule = await this.db.getCategoryRuleByPattern(rule.pattern);
                        
                        if (existingRule && !replaceExisting) {
                            importStats.rulesSkipped++;
                            continue;
                        }

                        if (existingRule && replaceExisting) {
                            // Update existing rule
                            await this.db.updateCategoryRule(
                                existingRule.id,
                                rule.pattern,
                                rule.category,
                                rule.priority,
                                rule.enabled
                            );
                            importStats.rulesUpdated++;
                        } else {
                            // Create new rule
                            await this.db.saveCategoryRule(
                                rule.pattern,
                                rule.category,
                                rule.priority
                            );
                            importStats.rulesImported++;
                        }
                    } catch (ruleError) {
                        importStats.errors.push(`Failed to import rule '${rule.pattern}': ${ruleError.message}`);
                    }
                }
            }

            // Import category overrides
            if (backup.categoryOverrides && backup.categoryOverrides.length > 0) {
                for (const override of backup.categoryOverrides) {
                    try {
                        // Check if override already exists
                        const existingOverrides = await this.db.getCategoryOverrides();
                        const exists = existingOverrides.some(existing => 
                            existing.transaction_hash === override.transactionHash
                        );
                        
                        if (exists && !replaceExisting) {
                            importStats.overridesSkipped++;
                            continue;
                        }
                        
                        // Save the category override
                        await this.db.saveCategoryOverride(
                            override.transactionHash,
                            override.originalCategory,
                            override.overrideCategory
                        );
                        importStats.overridesImported++;
                    } catch (overrideError) {
                        importStats.errors.push(`Failed to import override for ${override.transactionHash}: ${overrideError.message}`);
                    }
                }
            }

            // Import custom categories
            if (backup.customCategories) {
                try {
                    await this.customCategoryManager.updateCategories(backup.customCategories);
                    importStats.categoriesImported = Object.keys(backup.customCategories).length;
                } catch (categoryError) {
                    importStats.errors.push(`Failed to import custom categories: ${categoryError.message}`);
                }
            }

            console.log('✅ Category rules and overrides import completed:');
            console.log(`📊 Rules imported: ${importStats.rulesImported}`);
            console.log(`📊 Rules updated: ${importStats.rulesUpdated}`);
            console.log(`📊 Rules skipped: ${importStats.rulesSkipped}`);
            console.log(`📊 Overrides imported: ${importStats.overridesImported}`);
            console.log(`📊 Overrides skipped: ${importStats.overridesSkipped}`);
            console.log(`📊 Categories imported: ${importStats.categoriesImported}`);
            
            if (importStats.errors.length > 0) {
                console.log('⚠️ Errors encountered:');
                importStats.errors.forEach(error => console.log(`   - ${error}`));
            }

            return {
                success: true,
                stats: importStats
            };

        } catch (error) {
            console.error('❌ Error importing category rules:', error);
            throw new Error(`Import failed: ${error.message}`);
        }
    }

    /**
     * Validate backup file structure
     */
    validateBackupStructure(backup) {
        if (!backup || typeof backup !== 'object') {
            throw new Error('Invalid backup file: not a valid JSON object');
        }

        if (!backup.metadata) {
            throw new Error('Invalid backup file: missing metadata');
        }

        if (!backup.categoryRules && !backup.customCategories && !backup.categoryOverrides) {
            throw new Error('Invalid backup file: no category rules, overrides, or custom categories found');
        }

        if (backup.categoryRules && !Array.isArray(backup.categoryRules)) {
            throw new Error('Invalid backup file: categoryRules must be an array');
        }

        if (backup.categoryOverrides && !Array.isArray(backup.categoryOverrides)) {
            throw new Error('Invalid backup file: categoryOverrides must be an array');
        }

        // Validate each rule structure
        if (backup.categoryRules) {
            for (const rule of backup.categoryRules) {
                if (!rule.pattern || !rule.category) {
                    throw new Error('Invalid backup file: each rule must have pattern and category');
                }
            }
        }

        // Validate each override structure
        if (backup.categoryOverrides) {
            for (const override of backup.categoryOverrides) {
                if (!override.transactionHash || !override.originalCategory || !override.overrideCategory) {
                    throw new Error('Invalid backup file: each override must have transactionHash, originalCategory, and overrideCategory');
                }
            }
        }

        console.log('✅ Backup file structure is valid');
        return true;
    }

    /**
     * Clear all category rules from database
     */
    async clearAllCategoryRules() {
        try {
            const rules = await this.db.getAllCategoryRules();
            for (const rule of rules) {
                await this.db.deleteCategoryRule(rule.id);
            }
            console.log(`🗑️ Cleared ${rules.length} existing category rules`);
        } catch (error) {
            throw new Error(`Failed to clear existing rules: ${error.message}`);
        }
    }

    /**
     * Create automatic backup with timestamp
     */
    async createTimestampedBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `category-rules-backup-${timestamp}.json`);
        return await this.exportRules(backupPath);
    }

    /**
     * List all available backup files
     */
    async listBackups() {
        try {
            if (!await fs.pathExists(this.backupDir)) {
                return [];
            }

            const files = await fs.readdir(this.backupDir);
            const backupFiles = files.filter(file => 
                file.startsWith('category-rules-backup') && file.endsWith('.json')
            );

            const backups = [];
            for (const file of backupFiles) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);
                const backup = await fs.readJSON(filePath);
                
                backups.push({
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    rulesCount: backup.metadata?.totalRules || 0,
                    categoriesCount: backup.metadata?.totalCustomCategories || 0,
                    exportedAt: backup.metadata?.exportedAt
                });
            }

            return backups.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        } catch (error) {
            console.error('Error listing backups:', error);
            return [];
        }
    }
}

module.exports = CategoryRuleBackupManager;