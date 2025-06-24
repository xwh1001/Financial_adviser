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
                "name": "Food",
                "icon": "🍽️",
                "description": "Food and non-alcoholic beverages"
            },
            "ALCOHOLIC_TOBACCO": {
                "name": "Alcoholic & Tobacco",
                "icon": "🍷",
                "description": "Alcoholic beverages, tobacco and narcotics"
            },
            "CLOTHING_FOOTWEAR": {
                "name": "Clothing & Footwear",
                "icon": "👕",
                "description": "Clothing and footwear"
            },
            "HOUSING": {
                "name": "Housing",
                "icon": "🏠",
                "description": "Housing, water, electricity, gas and other fuels"
            },
            "HOUSEHOLD_EQUIPMENT": {
                "name": "Household Equipment",
                "icon": "🪑",
                "description": "Furnishings, household equipment and routine household maintenance"
            },
            "HEALTH": {
                "name": "Health",
                "icon": "🏥",
                "description": "Health services and products"
            },
            "TRANSPORT": {
                "name": "Transport",
                "icon": "🚗",
                "description": "Transportation services and products"
            },
            "COMMUNICATION": {
                "name": "Communication",
                "icon": "📱",
                "description": "Communication services and equipment"
            },
            "RECREATION": {
                "name": "Recreation",
                "icon": "🎭",
                "description": "Recreation and culture"
            },
            "EDUCATION": {
                "name": "Education",
                "icon": "🎓",
                "description": "Education services and supplies"
            },
            "RESTAURANTS_HOTELS": {
                "name": "Restaurants & Hotels",
                "icon": "🍽️",
                "description": "Restaurants and hotels"
            },
            "MISCELLANEOUS": {
                "name": "Miscellaneous",
                "icon": "📦",
                "description": "Miscellaneous goods and services"
            }
        };
    }

    getDefaultCategoryMapping() {
        return {
            // COICOP Division 01: Food and non-alcoholic beverages
            "FOOD_GROCERIES": "FOOD",
            "FOOD_BEVERAGES": "FOOD",
            "FOOD_SPECIALTY": "FOOD",
            
            // COICOP Division 02: Alcoholic beverages, tobacco and narcotics
            "ALCOHOL_BEVERAGES": "ALCOHOLIC_TOBACCO",
            "TOBACCO_PRODUCTS": "ALCOHOLIC_TOBACCO",
            
            // COICOP Division 03: Clothing and footwear
            "CLOTHING_APPAREL": "CLOTHING_FOOTWEAR",
            "CLOTHING_FOOTWEAR": "CLOTHING_FOOTWEAR",
            
            // COICOP Division 04: Housing, water, electricity, gas and other fuels
            "HOUSING_RENT": "HOUSING",
            "HOUSING_MORTGAGE": "HOUSING",
            "HOUSING_MAINTENANCE": "HOUSING",
            "UTILITIES_ELECTRICITY": "HOUSING",
            "UTILITIES_GAS": "HOUSING",
            "UTILITIES_WATER": "HOUSING",
            
            // COICOP Division 05: Furnishings, household equipment and routine household maintenance
            "HOUSEHOLD_FURNITURE": "HOUSEHOLD_EQUIPMENT",
            "HOUSEHOLD_APPLIANCES": "HOUSEHOLD_EQUIPMENT",
            "HOUSEHOLD_SUPPLIES": "HOUSEHOLD_EQUIPMENT",
            
            // COICOP Division 06: Health
            "HEALTH_MEDICAL": "HEALTH",
            "HEALTH_PHARMACY": "HEALTH",
            "HEALTH_DENTAL": "HEALTH",
            "HEALTH_INSURANCE": "HEALTH",
            
            // COICOP Division 07: Transport
            "TRANSPORT_VEHICLES": "TRANSPORT",
            "TRANSPORT_FUEL": "TRANSPORT",
            "TRANSPORT_PUBLIC": "TRANSPORT",
            "TRANSPORT_RIDESHARE": "TRANSPORT",
            "TRANSPORT_PARKING": "TRANSPORT",
            "TRANSPORT_MAINTENANCE": "TRANSPORT",
            "TRANSPORT_REGISTRATION": "TRANSPORT",
            
            // COICOP Division 08: Communication
            "COMMUNICATION_MOBILE": "COMMUNICATION",
            "COMMUNICATION_INTERNET": "COMMUNICATION",
            "COMMUNICATION_POSTAL": "COMMUNICATION",
            
            // COICOP Division 09: Recreation and culture
            "RECREATION_ENTERTAINMENT": "RECREATION",
            "RECREATION_STREAMING": "RECREATION",
            "RECREATION_SPORTS": "RECREATION",
            "RECREATION_TRAVEL": "RECREATION",
            "RECREATION_GAMING": "RECREATION",
            "RECREATION_HOBBIES": "RECREATION",
            
            // COICOP Division 10: Education
            "EDUCATION_TUITION": "EDUCATION",
            "EDUCATION_SUPPLIES": "EDUCATION",
            "EDUCATION_COURSES": "EDUCATION",
            "CHILDCARE": "EDUCATION",
            
            // COICOP Division 11: Restaurants and hotels
            "DINING_RESTAURANTS": "RESTAURANTS_HOTELS",
            "DINING_TAKEAWAY": "RESTAURANTS_HOTELS",
            "DINING_CAFES": "RESTAURANTS_HOTELS",
            "DINING_PUBS": "RESTAURANTS_HOTELS",
            "DINING_ETHNIC": "RESTAURANTS_HOTELS",
            "ACCOMMODATION": "RESTAURANTS_HOTELS",
            
            // COICOP Division 12: Miscellaneous goods and services
            "PERSONAL_CARE": "MISCELLANEOUS",
            "FINANCIAL_SERVICES": "MISCELLANEOUS",
            "INSURANCE_GENERAL": "MISCELLANEOUS",
            "PROFESSIONAL_SERVICES": "MISCELLANEOUS",
            "CHARITABLE_DONATIONS": "MISCELLANEOUS",
            "PETS": "MISCELLANEOUS",
            "OTHER": "MISCELLANEOUS"
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