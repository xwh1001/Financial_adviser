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
            // COICOP DIVISION 01: Food and non-alcoholic beverages
            'FOOD_GROCERIES': [
                'WOOLWORTHS', 'COLES', 'IGA', 'ALDI', 'SUPERMARKET', 'FOODLAND', 'SPAR',
                'FRESH TONE', 'ASIAN GROCER', 'BUTCHER', 'BAKERY', 'FRUIT', 'VEGETABLE', 'GOLDLAND'
            ],
            'FOOD_BEVERAGES': [
                'JUICE', 'SOFT DRINK', 'WATER', 'BEVERAGE', 'COFFEE BEANS', 'TEA'
            ],
            'FOOD_SPECIALTY': [
                'DELI', 'SEAFOOD', 'ORGANIC', 'HEALTH FOOD', 'GOURMET'
            ],
            
            // COICOP DIVISION 02: Alcoholic beverages, tobacco and narcotics
            'ALCOHOL_BEVERAGES': [
                'BWS', 'DAN MURPHY', 'LIQUOR', 'WINE', 'BEER', 'SPIRITS', 'ALCOHOL',
                'BOTTLE SHOP', 'CELLARBRATIONS', 'FIRST CHOICE'
            ],
            'TOBACCO_PRODUCTS': [
                'TOBACCO', 'CIGARETTE', 'CIGAR', 'SMOKING'
            ],
            
            // COICOP DIVISION 03: Clothing and footwear
            'CLOTHING_APPAREL': [
                'UNIQLO', 'H&M', 'ZARA', 'COTTON ON', 'TARGET', 'KMART', 'BIG W',
                'MYER', 'DAVID JONES', 'KATHMANDU', 'BONDS', 'FASHION', 'CLOTHING'
            ],
            'CLOTHING_FOOTWEAR': [
                'SHOES', 'BOOTS', 'SANDALS', 'SNEAKERS', 'FOOTWEAR', 'ATHLETE FOOT'
            ],
            
            // COICOP DIVISION 04: Housing, water, electricity, gas and other fuels
            'HOUSING_RENT': [
                'RENT', 'RENTAL', 'PROPERTY', 'REAL ESTATE', 'ESTATE', 'REALTY'
            ],
            'HOUSING_MORTGAGE': [
                'MORTGAGE', 'HOME LOAN', 'REPAYMENT'
            ],
            'UTILITIES_ELECTRICITY': [
                'ELECTRICITY', 'ELECTRIC', 'ORIGIN', 'AGL', 'RED ENERGY',
                'SIMPLY ENERGY', 'POWERSHOP', 'MOMENTUM', 'ENERGY AUSTRALIA'
            ],
            'UTILITIES_GAS': [
                'GAS', 'NATURAL GAS', 'LPG'
            ],
            'UTILITIES_WATER': [
                'WATER', 'YARRA VALLEY', 'SYDNEY WATER', 'SA WATER', 'UNITY WATER'
            ],
            'HOUSING_MAINTENANCE': [
                'PLUMBER', 'ELECTRICIAN', 'PAINTER', 'CLEANER', 'MAINTENANCE',
                'REPAIR', 'SERVICE', 'HANDYMAN'
            ],
            
            // COICOP DIVISION 05: Furnishings, household equipment and routine household maintenance
            'HOUSEHOLD_FURNITURE': [
                'IKEA', 'FANTASTIC', 'FURNITURE', 'SOFA', 'BED', 'TABLE', 'CHAIR'
            ],
            'HOUSEHOLD_APPLIANCES': [
                'JB HI-FI', 'HARVEY NORMAN', 'APPLIANCE', 'WASHING MACHINE', 'FRIDGE',
                'DISHWASHER', 'MICROWAVE', 'VACUUM'
            ],
            'HOUSEHOLD_SUPPLIES': [
                'BUNNINGS', 'SPOTLIGHT', 'TEMPLE', 'WEBER', 'HARDWARE', 'GARDEN',
                'TOOLS', 'CLEANING', 'DETERGENT'
            ],
            
            // COICOP DIVISION 06: Health
            'HEALTH_MEDICAL': [
                'DOCTOR', 'DENTIST', 'HOSPITAL', 'MEDICAL', 'CLINIC', 'PHYSIO',
                'CHIRO', 'OSTEO', 'SPECIALIST', 'PATHOLOGY'
            ],
            'HEALTH_PHARMACY': [
                'PHARMACY', 'CHEMIST', 'PRICELINE', 'TERRY WHITE', 'AMCAL',
                'MEDICINE', 'PRESCRIPTION'
            ],
            'HEALTH_DENTAL': [
                'DENTIST', 'DENTAL', 'ORTHODONTIST', 'ORAL HEALTH'
            ],
            'HEALTH_INSURANCE': [
                'MEDIBANK', 'BUPA', 'HCF', 'NIB', 'HEALTH INSURANCE'
            ],
            
            // COICOP DIVISION 07: Transport
            'TRANSPORT_VEHICLE': [
                'CAR DEALER', 'AUTO', 'VEHICLE', 'CAR PURCHASE', 'MOTORBIKE'
            ],
            'TRANSPORT_FUEL': [
                'PETROL', 'FUEL', 'BP', 'SHELL', 'CALTEX', 'MOBIL', '7-ELEVEN', 'UNITED',
                'DIESEL', 'SERVO'
            ],
            'TRANSPORT_PUBLIC': [
                'METRO TRAIN', 'OPAL', 'MYKI', 'TRANSLINK', 'METROCARD', 'BUS', 'TRAIN', 'TRAM', 'FERRY'
            ],
            'TRANSPORT_RIDESHARE': [
                'UBER', 'TAXI', 'LYFT', 'DIDI', 'RIDESHARE'
            ],
            'TRANSPORT_PARKING': [
                'PARKING', 'PARK', 'METER', 'GARAGE'
            ],
            'TRANSPORT_MAINTENANCE': [
                'MECHANIC', 'SERVICE', 'TYRES', 'AUTO REPAIR', 'CAR WASH'
            ],
            'TRANSPORT_REGISTRATION': [
                'REGO', 'REGISTRATION', 'ROADSIDE', 'RACV', 'NRMA', 'TOLLS'
            ],
            
            // COICOP DIVISION 08: Information and communication
            'COMMUNICATION_MOBILE': [
                'TELSTRA', 'OPTUS', 'VODAFONE', 'MOBILE', 'PHONE BILL', 'PREPAID'
            ],
            'COMMUNICATION_INTERNET': [
                'TPG', 'IINET', 'AUSSIE BROADBAND', 'TANGERINE', 'INTERNET', 'BROADBAND',
                'NBN', 'WIFI'
            ],
            'COMMUNICATION_POSTAL': [
                'AUSTRALIA POST', 'POSTAL', 'POSTAGE', 'COURIER', 'DELIVERY'
            ],
            
            // COICOP DIVISION 09: Recreation, sport and culture
            'RECREATION_ENTERTAINMENT': [
                'CINEMA', 'MOVIE', 'THEATRE', 'CONCERT', 'EVENT', 'TICKETS',
                'MELBOURNE CUP', 'SPORTS'
            ],
            'RECREATION_SPORTS': [
                'GYM', 'FITNESS', 'YOGA', 'PILATES', 'PERSONAL TRAINER',
                'ANYTIME FITNESS', 'JETTS', 'F45', 'SPORTS CLUB'
            ],
            'RECREATION_HOBBIES': [
                'BOOKS', 'MAGAZINES', 'HOBBIES', 'CRAFT', 'ART SUPPLIES'
            ],
            'RECREATION_GAMING': [
                'STEAM', 'GAMING', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'GAME'
            ],
            'RECREATION_STREAMING': [
                'NETFLIX', 'SPOTIFY', 'DISNEY', 'AMAZON PRIME', 'STAN', 'BINGE',
                'YOUTUBE', 'APPLE MUSIC', 'FOXTEL'
            ],
            'RECREATION_TRAVEL': [
                'HOTEL', 'MOTEL', 'AIRBNB', 'BOOKING', 'FLIGHT', 'JETSTAR',
                'QANTAS', 'VIRGIN', 'TIGERAIR', 'TRAVEL', 'HOLIDAY'
            ],
            
            // COICOP DIVISION 10: Education services
            'EDUCATION_TUITION': [
                'UNIVERSITY', 'TAFE', 'SCHOOL', 'TUITION', 'FEES'
            ],
            'EDUCATION_SUPPLIES': [
                'BOOKS', 'STATIONERY', 'STUDY', 'TEXTBOOK', 'SCHOOL SUPPLIES'
            ],
            'EDUCATION_COURSES': [
                'COURSE', 'TRAINING', 'WORKSHOP', 'SEMINAR', 'CERTIFICATION'
            ],
            
            // COICOP DIVISION 11: Restaurants and hotels
            'DINING_RESTAURANTS': [
                'RESTAURANT', 'BISTRO', 'FINE DINING', 'STEAKHOUSE'
            ],
            'DINING_TAKEAWAY': [
                'MCDONALD', 'KFC', 'SUBWAY', 'HUNGRY', 'DOMINO', 'PIZZA',
                'BURGER', 'TAKEAWAY', 'FAST FOOD'
            ],
            'DINING_CAFES': [
                'CAFE', 'COFFEE', 'STARBUCKS', 'GLORIA JEANS'
            ],
            'DINING_PUBS': [
                'PUB', 'BAR', 'GRILL', 'BBQ', 'ROAST', 'TAVERN'
            ],
            'DINING_ETHNIC': [
                'SUSHI TRAIN', 'SUSHI', 'THAI', 'CHINESE', 'INDIAN', 'JAPANESE', 'VIETNAMESE',
                'MEXICAN', 'ITALIAN'
            ],
            'ACCOMMODATION': [
                'HOTEL', 'MOTEL', 'RESORT', 'ACCOMMODATION'
            ],
            
            // COICOP DIVISION 12: Miscellaneous goods and services
            'PERSONAL_CARE': [
                'HAIRDRESSER', 'BARBER', 'BEAUTY', 'MASSAGE', 'SPA', 'NAIL',
                'COSMETIC', 'SKINCARE'
            ],
            'FINANCIAL_SERVICES': [
                'BANK FEE', 'ATM', 'OVERDRAFT', 'INTEREST', 'CHARGE', 'PENALTY'
            ],
            'INSURANCE_GENERAL': [
                'INSURANCE', 'NRMA', 'RACV', 'AAMI', 'BUDGET DIRECT', 'ALLIANZ',
                'QBE', 'SUNCORP'
            ],
            'PROFESSIONAL_SERVICES': [
                'LAWYER', 'ACCOUNTANT', 'LEGAL', 'SOLICITOR', 'NOTARY'
            ],
            'CHARITABLE_DONATIONS': [
                'DONATION', 'CHARITY', 'GIFT', 'FUNDRAISING'
            ],
            
            // Additional Categories (not strictly COICOP but useful)
            'CHILDCARE': [
                'CHILDCARE', 'DAYCARE', 'KINDERGARTEN', 'BABYSITTING', 'NANNY'
            ],
            'PETS': [
                'VET', 'PETBARN', 'PET', 'DOG', 'CAT', 'ANIMAL'
            ],
            'GOVERNMENT': [
                'ATO', 'CENTRELINK', 'MEDICARE', 'VICROADS', 'RMS', 'TMR',
                'GOVERNMENT', 'TAX', 'FINE', 'PENALTY'
            ],
            'INVESTMENTS': [
                'SHARE', 'STOCK', 'INVESTMENT', 'SUPER', 'FUND', 'VANGUARD',
                'BLACKROCK', 'COMMSEC', 'NABTRADE'
            ],
            'TRANSFERS': [
                'TRANSFER', 'BPAY', 'DIRECT DEBIT', 'PAYMENT', 'MCGRATH'
            ],
            'CASH_WITHDRAWAL': [
                'CASH', 'WITHDRAWAL', 'ATM'
            ],
            'SHOPPING_ONLINE': [
                'AMAZON', 'EBAY', 'PAYPAL', 'AFTERPAY', 'ZIP', 'ONLINE'
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

    /**
     * Get COICOP division structure for UI display
     */
    getCOICOPStructure() {
        return {
            'COICOP Division 01: Food and non-alcoholic beverages': [
                'FOOD_GROCERIES',
                'FOOD_BEVERAGES', 
                'FOOD_SPECIALTY'
            ],
            'COICOP Division 02: Alcoholic beverages, tobacco and narcotics': [
                'ALCOHOL_BEVERAGES',
                'TOBACCO_PRODUCTS'
            ],
            'COICOP Division 03: Clothing and footwear': [
                'CLOTHING_APPAREL',
                'CLOTHING_FOOTWEAR'
            ],
            'COICOP Division 04: Housing, water, electricity, gas and other fuels': [
                'HOUSING_RENT',
                'HOUSING_MORTGAGE',
                'UTILITIES_ELECTRICITY',
                'UTILITIES_GAS',
                'UTILITIES_WATER',
                'HOUSING_MAINTENANCE'
            ],
            'COICOP Division 05: Furnishings, household equipment and routine household maintenance': [
                'HOUSEHOLD_FURNITURE',
                'HOUSEHOLD_APPLIANCES',
                'HOUSEHOLD_SUPPLIES'
            ],
            'COICOP Division 06: Health': [
                'HEALTH_MEDICAL',
                'HEALTH_PHARMACY',
                'HEALTH_DENTAL',
                'HEALTH_INSURANCE'
            ],
            'COICOP Division 07: Transport': [
                'TRANSPORT_VEHICLE',
                'TRANSPORT_FUEL',
                'TRANSPORT_PUBLIC',
                'TRANSPORT_RIDESHARE',
                'TRANSPORT_PARKING',
                'TRANSPORT_MAINTENANCE',
                'TRANSPORT_REGISTRATION'
            ],
            'COICOP Division 08: Information and communication': [
                'COMMUNICATION_MOBILE',
                'COMMUNICATION_INTERNET',
                'COMMUNICATION_POSTAL'
            ],
            'COICOP Division 09: Recreation, sport and culture': [
                'RECREATION_ENTERTAINMENT',
                'RECREATION_SPORTS',
                'RECREATION_HOBBIES',
                'RECREATION_GAMING',
                'RECREATION_STREAMING',
                'RECREATION_TRAVEL'
            ],
            'COICOP Division 10: Education services': [
                'EDUCATION_TUITION',
                'EDUCATION_SUPPLIES',
                'EDUCATION_COURSES'
            ],
            'COICOP Division 11: Restaurants and hotels': [
                'DINING_RESTAURANTS',
                'DINING_TAKEAWAY',
                'DINING_CAFES',
                'DINING_PUBS',
                'DINING_ETHNIC',
                'ACCOMMODATION'
            ],
            'COICOP Division 12: Miscellaneous goods and services': [
                'PERSONAL_CARE',
                'FINANCIAL_SERVICES',
                'INSURANCE_GENERAL',
                'PROFESSIONAL_SERVICES',
                'CHARITABLE_DONATIONS'
            ],
            'Additional Categories': [
                'CHILDCARE',
                'PETS',
                'GOVERNMENT',
                'INVESTMENTS',
                'TRANSFERS',
                'CASH_WITHDRAWAL',
                'SHOPPING_ONLINE'
            ]
        };
    }

    /**
     * Get category display names
     */
    getCategoryDisplayNames() {
        return {
            // Division 01
            'FOOD_GROCERIES': 'Groceries & Food',
            'FOOD_BEVERAGES': 'Non-Alcoholic Beverages',
            'FOOD_SPECIALTY': 'Specialty Food',
            
            // Division 02
            'ALCOHOL_BEVERAGES': 'Alcoholic Beverages',
            'TOBACCO_PRODUCTS': 'Tobacco Products',
            
            // Division 03
            'CLOTHING_APPAREL': 'Clothing & Apparel',
            'CLOTHING_FOOTWEAR': 'Footwear',
            
            // Division 04
            'HOUSING_RENT': 'Rent',
            'HOUSING_MORTGAGE': 'Mortgage',
            'UTILITIES_ELECTRICITY': 'Electricity',
            'UTILITIES_GAS': 'Gas',
            'UTILITIES_WATER': 'Water',
            'HOUSING_MAINTENANCE': 'Home Maintenance',
            
            // Division 05
            'HOUSEHOLD_FURNITURE': 'Furniture',
            'HOUSEHOLD_APPLIANCES': 'Appliances',
            'HOUSEHOLD_SUPPLIES': 'Household Supplies',
            
            // Division 06
            'HEALTH_MEDICAL': 'Medical Services',
            'HEALTH_PHARMACY': 'Pharmacy',
            'HEALTH_DENTAL': 'Dental Care',
            'HEALTH_INSURANCE': 'Health Insurance',
            
            // Division 07
            'TRANSPORT_VEHICLE': 'Vehicle Purchases',
            'TRANSPORT_FUEL': 'Fuel',
            'TRANSPORT_PUBLIC': 'Public Transport',
            'TRANSPORT_RIDESHARE': 'Rideshare & Taxi',
            'TRANSPORT_PARKING': 'Parking',
            'TRANSPORT_MAINTENANCE': 'Vehicle Maintenance',
            'TRANSPORT_REGISTRATION': 'Registration & Tolls',
            
            // Division 08
            'COMMUNICATION_MOBILE': 'Mobile Phone',
            'COMMUNICATION_INTERNET': 'Internet & Broadband',
            'COMMUNICATION_POSTAL': 'Postal Services',
            
            // Division 09
            'RECREATION_ENTERTAINMENT': 'Entertainment',
            'RECREATION_SPORTS': 'Sports & Fitness',
            'RECREATION_HOBBIES': 'Hobbies',
            'RECREATION_GAMING': 'Gaming',
            'RECREATION_STREAMING': 'Streaming Services',
            'RECREATION_TRAVEL': 'Travel',
            
            // Division 10
            'EDUCATION_TUITION': 'Tuition & Fees',
            'EDUCATION_SUPPLIES': 'Education Supplies',
            'EDUCATION_COURSES': 'Courses & Training',
            
            // Division 11
            'DINING_RESTAURANTS': 'Restaurants',
            'DINING_TAKEAWAY': 'Takeaway & Fast Food',
            'DINING_CAFES': 'Cafes & Coffee',
            'DINING_PUBS': 'Pubs & Bars',
            'DINING_ETHNIC': 'Ethnic Cuisine',
            'ACCOMMODATION': 'Accommodation',
            
            // Division 12
            'PERSONAL_CARE': 'Personal Care',
            'FINANCIAL_SERVICES': 'Financial Services',
            'INSURANCE_GENERAL': 'General Insurance',
            'PROFESSIONAL_SERVICES': 'Professional Services',
            'CHARITABLE_DONATIONS': 'Donations',
            
            // Additional
            'CHILDCARE': 'Childcare',
            'PETS': 'Pets',
            'GOVERNMENT': 'Government',
            'INVESTMENTS': 'Investments',
            'TRANSFERS': 'Transfers',
            'CASH_WITHDRAWAL': 'Cash Withdrawal',
            'SHOPPING_ONLINE': 'Online Shopping'
        };
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