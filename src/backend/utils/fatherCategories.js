const fs = require('fs-extra');
const path = require('path');

class FatherCategoryManager {
    constructor() {
        this.fatherCategoriesPath = path.join(__dirname, '../../../data/father_categories.json');
        this.categoryMappingPath = path.join(__dirname, '../../../data/category_mapping.json');
    }

    async init() {
        await fs.ensureDir(path.dirname(this.fatherCategoriesPath));
        
        // Create father categories if not exists
        if (!await fs.pathExists(this.fatherCategoriesPath)) {
            await fs.writeJson(this.fatherCategoriesPath, this.getDefaultFatherCategories(), { spaces: 2 });
        }
        
        // Create category mapping if not exists
        if (!await fs.pathExists(this.categoryMappingPath)) {
            await fs.writeJson(this.categoryMappingPath, this.getDefaultCategoryMapping(), { spaces: 2 });
        }
    }

    getDefaultFatherCategories() {
        return {
            "FOOD": {
                "name": "Food & Dining",
                "icon": "🍽️",
                "description": "Food, groceries, and dining expenses"
            },
            "TRANSPORT": {
                "name": "Transportation", 
                "icon": "🚗",
                "description": "All transportation related expenses"
            },
            "SHOPPING": {
                "name": "Shopping",
                "icon": "🛍️", 
                "description": "Clothing, electronics, home goods, and general shopping"
            },
            "UTILITIES": {
                "name": "Utilities & Bills",
                "icon": "💡",
                "description": "Utilities, phone, internet, and recurring bills"
            },
            "ENTERTAINMENT": {
                "name": "Entertainment",
                "icon": "🎭",
                "description": "Movies, games, streaming, travel, and leisure activities"
            },
            "HEALTH": {
                "name": "Health & Wellness",
                "icon": "🏥",
                "description": "Medical, dental, pharmacy, and fitness expenses"
            },
            "FINANCIAL": {
                "name": "Financial Services",
                "icon": "💰",
                "description": "Banking, insurance, investments, and financial services"
            },
            "HOUSING": {
                "name": "Housing",
                "icon": "🏠",
                "description": "Rent, mortgage, and housing maintenance"
            },
            "LIFESTYLE": {
                "name": "Lifestyle & Personal",
                "icon": "✨",
                "description": "Personal care, education, childcare, and lifestyle expenses"
            },
            "OTHERS": {
                "name": "Others",
                "icon": "📦",
                "description": "Miscellaneous and uncategorized expenses"
            }
        };
    }

    getDefaultCategoryMapping() {
        return {
            // Food & Dining
            "GROCERIES": "FOOD",
            "DINING_OUT": "FOOD",
            
            // Transportation
            "TRANSPORT_PUBLIC": "TRANSPORT",
            "TRANSPORT_FUEL": "TRANSPORT",
            "TRANSPORT_RIDESHARE": "TRANSPORT",
            "TRANSPORT_PARKING": "TRANSPORT",
            "TRANSPORT_OTHER": "TRANSPORT",
            
            // Shopping
            "SHOPPING_CLOTHING": "SHOPPING",
            "SHOPPING_ELECTRONICS": "SHOPPING",
            "SHOPPING_HOME": "SHOPPING",
            "SHOPPING_ONLINE": "SHOPPING",
            
            // Utilities & Bills
            "UTILITIES_TELECOM": "UTILITIES",
            "UTILITIES_ENERGY": "UTILITIES",
            "UTILITIES_WATER": "UTILITIES",
            "UTILITIES_COUNCIL": "UTILITIES",
            
            // Entertainment
            "ENTERTAINMENT_STREAMING": "ENTERTAINMENT",
            "ENTERTAINMENT_ACTIVITIES": "ENTERTAINMENT",
            "ENTERTAINMENT_GAMING": "ENTERTAINMENT",
            "ENTERTAINMENT_TRAVEL": "ENTERTAINMENT",
            
            // Health & Wellness
            "HEALTH_MEDICAL": "HEALTH",
            "HEALTH_PHARMACY": "HEALTH",
            "HEALTH_FITNESS": "HEALTH",
            
            // Financial Services
            "BANKING_FEES": "FINANCIAL",
            "INSURANCE": "FINANCIAL",
            "INVESTMENTS": "FINANCIAL",
            
            // Housing
            "HOUSING_RENT": "HOUSING",
            "HOUSING_MORTGAGE": "HOUSING",
            "HOUSING_MAINTENANCE": "HOUSING",
            
            // Lifestyle & Personal
            "GOVERNMENT": "LIFESTYLE",
            "PROFESSIONAL_SERVICES": "LIFESTYLE",
            "EDUCATION": "LIFESTYLE",
            "PERSONAL_CARE": "LIFESTYLE",
            "CHILDCARE": "LIFESTYLE",
            "PETS": "LIFESTYLE",
            "SUBSCRIPTION": "LIFESTYLE",
            
            // Others
            "TRANSFERS": "OTHERS",
            "CASH_WITHDRAWAL": "OTHERS",
            "OTHER": "OTHERS"
        };
    }

    async getFatherCategories() {
        try {
            return await fs.readJson(this.fatherCategoriesPath);
        } catch (error) {
            console.error('Error reading father categories:', error);
            return this.getDefaultFatherCategories();
        }
    }

    async getCategoryMapping() {
        try {
            return await fs.readJson(this.categoryMappingPath);
        } catch (error) {
            console.error('Error reading category mapping:', error);
            return this.getDefaultCategoryMapping();
        }
    }

    async updateCategoryMapping(childCategory, fatherCategory) {
        try {
            const mapping = await this.getCategoryMapping();
            mapping[childCategory] = fatherCategory;
            await fs.writeJson(this.categoryMappingPath, mapping, { spaces: 2 });
            return true;
        } catch (error) {
            console.error('Error updating category mapping:', error);
            return false;
        }
    }

    async getFatherCategoryForChild(childCategory) {
        const mapping = await this.getCategoryMapping();
        return mapping[childCategory] || 'OTHERS';
    }

    async getChildrenForFatherCategory(fatherCategory) {
        const mapping = await this.getCategoryMapping();
        return Object.keys(mapping).filter(child => mapping[child] === fatherCategory);
    }

    async getCategoriesGroupedByFather() {
        const fatherCategories = await this.getFatherCategories();
        const mapping = await this.getCategoryMapping();
        
        const grouped = {};
        
        // Initialize with father categories
        for (const [fatherCode, fatherInfo] of Object.entries(fatherCategories)) {
            grouped[fatherCode] = {
                ...fatherInfo,
                children: []
            };
        }
        
        // Add children to their father categories
        for (const [childCategory, fatherCode] of Object.entries(mapping)) {
            if (grouped[fatherCode]) {
                grouped[fatherCode].children.push(childCategory);
            }
        }
        
        return grouped;
    }
}

module.exports = FatherCategoryManager;