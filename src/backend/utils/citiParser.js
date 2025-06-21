const fs = require('fs-extra');
const pdf = require('pdf-parse');
const FinancialCalculator = require('./financialCalculator');
const DateUtils = require('./dateUtils');

class CitiParser {
    constructor(database = null) {
        this.financialCalculator = new FinancialCalculator(database);
        // Month name to number mapping
        this.monthMap = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12,
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
            'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
            'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        };

        this.patterns = {
            // Citi transaction pattern - will be refined later
            transaction: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2})\s*([A-Za-z0-9\s\-&.'()*]+?)\s+([\d,]+\.?\d{0,2})/g,
            balance: /Closing Balance.*?\$?([\d,]+\.?\d{0,2})/i,
            payment: /Bpay Payments\s*-([\d,]+\.?\d{0,2})/i,
            statementBegin: /Statement Begin[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
            statementEnd: /Statement End[:\s]*(\d{2}\/\d{2}\/\d{4})/i
        };
    }

    async parsePDF(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            
            return this.extractCitiStatement(data.text);
        } catch (error) {
            console.error('Error parsing Citi PDF:', error);
            throw new Error(`Failed to parse Citi PDF: ${error.message}`);
        }
    }

    async extractCitiStatement(text) {
        console.log('🔍 Enhanced Citi Parser - Processing statement...');
        
        // Step 1: Extract year from "Statement Begins"
        let statementYear = new Date().getFullYear(); // Default fallback
        const statementBeginsMatch = text.match(/Statement Begins[:\s]*(\d{2}\/\d{2}\/\d{2,4})/i);
        if (statementBeginsMatch) {
            const dateStr = statementBeginsMatch[1];
            const dateParts = dateStr.split('/');
            // Handle 2-digit years (25 -> 2025)
            let year = parseInt(dateParts[2]);
            if (year < 100) {
                year += year < 50 ? 2000 : 1900; // Assume years < 50 are 20xx, others are 19xx
            }
            statementYear = year;
            console.log(`📅 Statement year from "Statement Begins": ${statementYear}`);
        }

        // Step 2: Find transaction sections by locating "Transactions" or "Transactions (Continued)"
        const transactions = [];
        
        // Process the entire text as one section to avoid overlapping section issues
        console.log(`📊 Processing entire document for transactions`);
        const allTransactions = await this.parseTransactionSection(text, statementYear);
        transactions.push(...allTransactions);
        
        console.log(`📈 Processed entire document`);

        // Extract balance and payment info
        const balanceMatch = text.match(this.patterns.balance);
        const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;

        const paymentMatch = text.match(this.patterns.payment);
        const payment = paymentMatch ? parseFloat(paymentMatch[1].replace(/,/g, '')) : null;

        console.log(`✅ Citi parsing complete: ${transactions.length} transactions found`);

        return {
            transactions,
            balance,
            payment,
            totalExpenses: transactions.reduce((sum, t) => sum + t.amount, 0),
            transactionCount: transactions.length
        };
    }

    // TODO: Implement enhanced Citi parsing methods
    // These will be added when we implement the Citi logic later
    
    async parseTransactionSection(sectionText, statementYear) {
        const transactions = [];
        
        // Remove page headers and footers
        let cleanText = sectionText;
        cleanText = cleanText.replace(/Page\s+\d+\s+of\s+\d+/g, '');
        cleanText = cleanText.replace(/Citibank.*?Card/g, '');
        cleanText = cleanText.replace(/Statement of Account/g, '');
        
        const lines = cleanText.split('\n');
        
        // Comprehensive patterns to capture ALL transaction formats
        const patterns = [
            // Format 1: Properly spaced: "Apr 02 Origin Energy Barangaroo Au 333.31"
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(.+?)\s+(-?\d{1,3}(?:,\d{3})*\.?\d{0,2})$/,
            // Format 2: Concatenated with reference: "Apr 02Origin Energy Barangaroo Au40.5955160005092353121499280"
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})(.+?)(\d{1,4}(?:,\d{3})*\.\d{2})(\d{15,})$/,
            // Format 3: Mixed spacing: "Apr 02 Origin Energy Barangaroo Au333.31"
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(.+?)(-?\d{1,3}(?:,\d{3})*\.\d{2})$/,
            // Format 4: Handle amounts without decimals: "Apr 02 Description 333"
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(.+?)\s+(-?\d{1,4})$/,
            // Format 5: Very flexible pattern to catch anything missed
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(.+?)[-\s]+(\d+\.?\d*)$/
        ];
        
        // Process lines and handle multi-line transactions
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.length === 0) continue;
            
            // Check if this line starts with a month (potential transaction)
            const monthMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/);
            if (!monthMatch) continue;
            
            const [, month, day] = monthMatch;
            
            // Debug: Show Origin Energy transactions specifically
            // if (line.includes('Origin Energy')) {
            //     console.log(`🔍 ORIGIN ENERGY: "${line}"`);
            // }
            
            // Try to match complete transaction patterns first
            let match = null;
            let description = '';
            let amountStr = '';
            
            for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
                const pattern = patterns[patternIndex];
                match = line.match(pattern);
                
                // Debug: Show pattern testing for Origin Energy
                // if (line.includes('Origin Energy') && line.includes('40.59')) {
                //     console.log(`   Testing pattern ${patternIndex + 1}: ${match ? 'MATCH' : 'NO MATCH'}`);
                // }
                
                if (match) {
                    if (patternIndex === 0) {
                        [, , , description, amountStr] = match;
                    } else if (patternIndex === 1) {
                        [, , , description, amountStr] = match; // take groups 3,4 ignore reference (5th element)
                        // Debug: Show extraction for Origin Energy
                        // if (line.includes('Origin Energy') && line.includes('40.59')) {
                        //     console.log(`   Pattern 2 FIXED extracted: month=${match[1]}, day=${match[2]}, desc="${description}", amount="${amountStr}"`);
                        // }
                    } else if (patternIndex === 2) {
                        [, , , description, amountStr] = match;
                    } else if (patternIndex === 3) {
                        [, , , description, amountStr] = match;
                    } else if (patternIndex === 4) {
                        [, , , description, amountStr] = match;
                        description = description.replace(/[-\s]+$/, '');
                    }
                    // Debug: Show Origin Energy pattern matches
                    // if (description.includes('Origin Energy')) {
                    //     console.log(`✅ ORIGIN ENERGY MATCHED Pattern ${patternIndex + 1}: ${month} ${day} | ${description} | ${amountStr}`);
                    // }
                    break;
                }
            }
            
            // If no complete match, try to find amount on next line
            if (!match) {
                // console.log(`❌ NO MATCH, checking next line for amount...`);
                
                // Extract description from current line
                const descMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})(.+)$/);
                if (descMatch && i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    // console.log(`   Next line: "${nextLine}"`);
                    
                    // Check if next line contains an amount
                    const amountMatch = nextLine.match(/^(-?\d{1,4}(?:,\d{3})*(?:\.\d{2})?)(?:\s|$)/);
                    if (amountMatch) {
                        description = descMatch[3].trim();
                        amountStr = amountMatch[1];
                        match = true;
                        // Debug: Show Origin Energy multi-line matches
                        // if (description.includes('Origin Energy')) {
                        //     console.log(`✅ ORIGIN ENERGY MULTI-LINE MATCH: ${month} ${day} | ${description} | ${amountStr}`);
                        // }
                        i++; // Skip the amount line
                    }
                }
            }
            
            if (match && amountStr) {
                // Clean up description
                const cleanDescription = description.trim();
                
                // Step 3: Ignore transactions if description = "Bpay Payments"
                if (cleanDescription === 'Bpay Payments') {
                    console.log(`❌ Skipping Bpay Payment: ${line}`);
                    continue;
                }
                
                // Parse amount (step 4: keep negative amounts as offset)
                const amount = parseFloat(amountStr.replace(/,/g, ''));
                if (isNaN(amount)) continue;
                
                // Create date in Australian timezone using standardized utility
                const monthNum = this.monthMap[month];
                const date = DateUtils.createAustralianDate(statementYear, monthNum, parseInt(day));
                
                // Categorize transaction
                const category = await this.financialCalculator.categorizeTransaction(cleanDescription);
                
                // Debug: Show when Origin Energy transactions are added
                // if (cleanDescription.includes('Origin Energy')) {
                //     console.log(`✅ ADDED ORIGIN ENERGY: ${month} ${day} | ${cleanDescription} | $${amount}`);
                // }
                
                transactions.push({
                    date: date.toISOString(),
                    description: cleanDescription,
                    amount: amount,
                    category: category
                });
            }
        }
        
        return transactions;
    }

    extractStatementPeriod(text) {
        // Placeholder for future implementation
        return null;
    }

    handleOffsetAmounts(text) {
        // Placeholder for future implementation
        return text;
    }
}

module.exports = CitiParser;