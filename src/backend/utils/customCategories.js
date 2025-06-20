const fs = require('fs-extra');
const path = require('path');

class CustomCategoryManager {
    constructor() {
        this.customCategoriesPath = path.join(__dirname, '../../../data/custom_categories.json');
        this.defaultCategoriesPath = path.join(__dirname, '../../../data/default_categories.json');
    }

    async init() {
        await fs.ensureDir(path.dirname(this.customCategoriesPath));
        
        // Create default categories backup if it doesn't exist
        const defaultCategories = this.getDefaultCategories();
        if (!await fs.pathExists(this.defaultCategoriesPath)) {
            await fs.writeJson(this.defaultCategoriesPath, defaultCategories, { spaces: 2 });
        }
        
        // Create custom categories file if it doesn't exist
        if (!await fs.pathExists(this.customCategoriesPath)) {
            await fs.writeJson(this.customCategoriesPath, defaultCategories, { spaces: 2 });
        }
    }

    getDefaultCategories() {
        return {
            // Food & Dining
            'GROCERIES': [
                'WOOLWORTHS', 'COLES', 'IGA', 'ALDI', 'SUPERMARKET', 'FOODLAND', 'SPAR',
                'FRESH TONE', 'ASIAN GROCER', 'BUTCHER', 'BAKERY', 'FRUIT', 'VEGETABLE', 'GOLDLAND'
            ],
            'DINING_OUT': [
                'RESTAURANT', 'CAFE', 'MCDONALD', 'KFC', 'SUBWAY', 'HUNGRY', 'DOMINO',
                'PIZZA', 'BURGER', 'SUSHI', 'THAI', 'CHINESE', 'INDIAN', 'BISTRO',
                'PUB', 'BAR', 'GRILL', 'BBQ', 'ROAST'
            ],
            
            // Transportation
            'TRANSPORT_PUBLIC': [
                'OPAL', 'MYKI', 'TRANSLINK', 'METROCARD', 'BUS', 'TRAIN', 'TRAM', 'FERRY'
            ],
            'TRANSPORT_FUEL': [
                'PETROL', 'FUEL', 'BP', 'SHELL', 'CALTEX', 'MOBIL', '7-ELEVEN', 'UNITED'
            ],
            'TRANSPORT_RIDESHARE': [
                'UBER', 'TAXI', 'LYFT', 'DIDI', 'RIDESHARE'
            ],
            'TRANSPORT_PARKING': [
                'PARKING', 'PARK', 'METER', 'GARAGE'
            ],
            'TRANSPORT_OTHER': [
                'TOLLS', 'REGO', 'REGISTRATION', 'ROADSIDE', 'RACV', 'NRMA'
            ],
            
            // Shopping & Retail
            'SHOPPING_CLOTHING': [
                'UNIQLO', 'H&M', 'ZARA', 'COTTON ON', 'TARGET', 'KMART', 'BIG W',
                'MYER', 'DAVID JONES', 'KATHMANDU', 'BONDS', 'SHOES', 'FASHION'
            ],
            'SHOPPING_ELECTRONICS': [
                'JB HI-FI', 'HARVEY NORMAN', 'OFFICEWORKS', 'APPLE', 'SAMSUNG',
                'COMPUTER', 'LAPTOP', 'PHONE', 'ELECTRONICS', 'TECH'
            ],
            'SHOPPING_HOME': [
                'BUNNINGS', 'IKEA', 'FANTASTIC', 'SPOTLIGHT', 'TEMPLE', 'WEBER',
                'FURNITURE', 'APPLIANCE', 'HARDWARE', 'GARDEN', 'TOOLS'
            ],
            'SHOPPING_ONLINE': [
                'AMAZON', 'EBAY', 'PAYPAL', 'AFTERPAY', 'ZIP', 'ONLINE'
            ],
            
            // Utilities & Bills
            'UTILITIES_TELECOM': [
                'TELSTRA', 'OPTUS', 'VODAFONE', 'TPG', 'IINET', 'AUSSIE BROADBAND',
                'TANGERINE', 'PHONE', 'INTERNET', 'MOBILE'
            ],
            'UTILITIES_ENERGY': [
                'ENERGY', 'ELECTRICITY', 'GAS', 'ORIGIN', 'AGL', 'RED ENERGY',
                'SIMPLY ENERGY', 'POWERSHOP', 'MOMENTUM'
            ],
            'UTILITIES_WATER': [
                'WATER', 'YARRA VALLEY', 'SYDNEY WATER', 'SA WATER', 'UNITY WATER'
            ],
            'UTILITIES_COUNCIL': [
                'COUNCIL', 'RATES', 'MUNICIPAL', 'CITY OF', 'SHIRE'
            ],
            
            // Entertainment & Recreation
            'ENTERTAINMENT_STREAMING': [
                'NETFLIX', 'SPOTIFY', 'DISNEY', 'AMAZON PRIME', 'STAN', 'BINGE',
                'YOUTUBE', 'APPLE MUSIC', 'FOXTEL'
            ],
            'ENTERTAINMENT_ACTIVITIES': [
                'CINEMA', 'MOVIE', 'THEATRE', 'CONCERT', 'EVENT', 'TICKETS',
                'MELBOURNE CUP', 'SPORTS', 'GYM', 'FITNESS', 'AQUANATION'
            ],
            'ENTERTAINMENT_GAMING': [
                'STEAM', 'GAMING', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'GAME'
            ],
            'ENTERTAINMENT_TRAVEL': [
                'HOTEL', 'MOTEL', 'AIRBNB', 'BOOKING', 'FLIGHT', 'JETSTAR',
                'QANTAS', 'VIRGIN', 'TIGERAIR', 'TRAVEL', 'HOLIDAY'
            ],
            
            // Health & Personal Care
            'HEALTH_MEDICAL': [
                'DOCTOR', 'DENTIST', 'HOSPITAL', 'MEDICAL', 'CLINIC', 'PHYSIO',
                'CHIRO', 'OSTEO', 'SPECIALIST', 'PATHOLOGY'
            ],
            'HEALTH_PHARMACY': [
                'PHARMACY', 'CHEMIST', 'PRICELINE', 'TERRY WHITE', 'AMCAL',
                'MEDICINE', 'PRESCRIPTION'
            ],
            'HEALTH_FITNESS': [
                'GYM', 'FITNESS', 'YOGA', 'PILATES', 'PERSONAL TRAINER',
                'ANYTIME FITNESS', 'JETTS', 'F45'
            ],
            
            // Financial Services
            'BANKING_FEES': [
                'BANK FEE', 'ATM', 'OVERDRAFT', 'INTEREST', 'CHARGE', 'PENALTY'
            ],
            'INSURANCE': [
                'INSURANCE', 'NRMA', 'RACV', 'AAMI', 'BUDGET DIRECT', 'ALLIANZ',
                'QBE', 'SUNCORP', 'MEDIBANK', 'BUPA', 'HCF'
            ],
            'INVESTMENTS': [
                'SHARE', 'STOCK', 'INVESTMENT', 'SUPER', 'FUND', 'VANGUARD',
                'BLACKROCK', 'COMMSEC', 'NABTRADE'
            ],
            
            // Housing & Property
            'HOUSING_RENT': [
                'RENT', 'RENTAL', 'PROPERTY', 'REAL ESTATE', 'ESTATE', 'REALTY'
            ],
            'HOUSING_MORTGAGE': [
                'MORTGAGE', 'HOME LOAN', 'REPAYMENT'
            ],
            'HOUSING_MAINTENANCE': [
                'PLUMBER', 'ELECTRICIAN', 'PAINTER', 'CLEANER', 'MAINTENANCE',
                'REPAIR', 'SERVICE'
            ],
            
            // Government & Legal
            'GOVERNMENT': [
                'ATO', 'CENTRELINK', 'MEDICARE', 'VICROADS', 'RMS', 'TMR',
                'GOVERNMENT', 'TAX', 'FINE', 'PENALTY'
            ],
            'PROFESSIONAL_SERVICES': [
                'LAWYER', 'ACCOUNTANT', 'LEGAL', 'SOLICITOR', 'NOTARY'
            ],
            
            // Education & Personal Development
            'EDUCATION': [
                'UNIVERSITY', 'TAFE', 'SCHOOL', 'EDUCATION', 'COURSE', 'TRAINING',
                'TUITION', 'BOOKS', 'STUDY'
            ],
            
            // Personal & Family
            'PERSONAL_CARE': [
                'HAIRDRESSER', 'BARBER', 'BEAUTY', 'MASSAGE', 'SPA', 'NAIL',
                'COSMETIC', 'SKINCARE'
            ],
            'CHILDCARE': [
                'CHILDCARE', 'DAYCARE', 'KINDERGARTEN', 'BABYSITTING', 'NANNY'
            ],
            'PETS': [
                'VET', 'PETBARN', 'PET', 'DOG', 'CAT', 'ANIMAL'
            ],
            
            // Transfers & Payments
            'TRANSFERS': [
                'TRANSFER', 'BPAY', 'DIRECT DEBIT', 'PAYMENT', 'MCGRATH'
            ],
            'CASH_WITHDRAWAL': [
                'CASH', 'WITHDRAWAL', 'ATM'
            ]
        };
    }

    async getCustomCategories() {
        try {
            return await fs.readJson(this.customCategoriesPath);
        } catch (error) {
            console.error('Error reading custom categories:', error);
            return this.getDefaultCategories();
        }
    }

    async saveCustomCategories(categories) {
        try {
            await fs.writeJson(this.customCategoriesPath, categories, { spaces: 2 });
            return true;
        } catch (error) {
            console.error('Error saving custom categories:', error);
            return false;
        }
    }

    async addCategory(categoryName, keywords = []) {
        const categories = await this.getCustomCategories();
        categories[categoryName] = keywords;
        return await this.saveCustomCategories(categories);
    }

    async removeCategory(categoryName) {
        const categories = await this.getCustomCategories();
        delete categories[categoryName];
        return await this.saveCustomCategories(categories);
    }

    async updateCategory(categoryName, keywords) {
        const categories = await this.getCustomCategories();
        if (categories[categoryName]) {
            categories[categoryName] = keywords;
            return await this.saveCustomCategories(categories);
        }
        return false;
    }

    async addKeywordToCategory(categoryName, keyword) {
        const categories = await this.getCustomCategories();
        if (categories[categoryName]) {
            if (!categories[categoryName].includes(keyword)) {
                categories[categoryName].push(keyword);
                return await this.saveCustomCategories(categories);
            }
        }
        return false;
    }

    async removeKeywordFromCategory(categoryName, keyword) {
        const categories = await this.getCustomCategories();
        if (categories[categoryName]) {
            categories[categoryName] = categories[categoryName].filter(k => k !== keyword);
            return await this.saveCustomCategories(categories);
        }
        return false;
    }

    async restoreDefaults() {
        const defaultCategories = this.getDefaultCategories();
        return await this.saveCustomCategories(defaultCategories);
    }

    getCategories() {
        // Synchronous method for compatibility with backup manager
        // Return hardcoded defaults as fallback since this must be synchronous
        return this.getDefaultCategories();
    }

    async updateCategories(newCategories) {
        // Method to update all categories at once (used by backup manager)
        return await this.saveCustomCategories(newCategories);
    }

    async getDefaultCategoryList() {
        try {
            return await fs.readJson(this.defaultCategoriesPath);
        } catch (error) {
            return this.getDefaultCategories();
        }
    }
}

module.exports = CustomCategoryManager;