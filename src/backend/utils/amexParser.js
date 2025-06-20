const fs = require('fs-extra');
const pdf = require('pdf-parse');
const FinancialCalculator = require('./financialCalculator');

class AmexParser {
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
            statementPeriod: /From\s+([A-Za-z]+\s+\d{1,2})\s+to\s+([A-Za-z]+\s+\d{1,2}),\s+(\d{4})/i,
            balance: /Closing Balance.*?\$?([\d,]+\.?\d{0,2})/i,
            payment: /Amount Payable.*?([\d,]+\.?\d{0,2})/i
        };
    }

    async parsePDF(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            
            return this.extractAmexStatement(data.text);
        } catch (error) {
            console.error('Error parsing AMEX PDF:', error);
            throw new Error(`Failed to parse AMEX PDF: ${error.message}`);
        }
    }

    async extractAmexStatement(text) {
        console.log('🔍 Enhanced AMEX Parser - Processing statement...');
        
        // Step 1: Remove Payments Section to exclude payment transactions
        let cleanedText = text;
        const paymentSectionStart = text.indexOf('Payments Section');
        const paymentSectionEnd = text.indexOf('New Transactions');
        
        if (paymentSectionStart !== -1 && paymentSectionEnd !== -1) {
            cleanedText = text.substring(0, paymentSectionStart) + text.substring(paymentSectionEnd);
            console.log('✅ Removed Payments Section');
        }

        // Step 2: Find ALL "New Transactions for:" sections (multiple cardholders)
        const allTransactions = [];
        let searchPos = 0;
        let sectionCount = 0;
        
        while (true) {
            const newTransactionPos = cleanedText.indexOf('New Transactions for:', searchPos);
            if (newTransactionPos === -1) break;
            
            // Find the end of this section (next "New Transactions for:" or end of document)
            let nextSectionPos = cleanedText.indexOf('New Transactions for:', newTransactionPos + 1);
            if (nextSectionPos === -1) {
                nextSectionPos = cleanedText.length;
            }
            
            const sectionText = cleanedText.substring(newTransactionPos, nextSectionPos);
            
            // Extract cardholder name
            const nameMatch = sectionText.match(/New Transactions for:([A-Z\s]+)/);
            const cardholderName = nameMatch ? nameMatch[1].trim() : 'Unknown';
            
            console.log(`📊 Processing section for: ${cardholderName}`);
            
            // Parse transactions in this section
            const sectionTransactions = this.parseTransactionSection(sectionText, cardholderName);
            allTransactions.push(...sectionTransactions);
            
            console.log(`   ✅ Found ${sectionTransactions.length} transactions`);
            sectionCount++;
            searchPos = newTransactionPos + 1;
        }

        console.log(`📈 Processed ${sectionCount} cardholder sections`);

        // Step 3: Extract year from statement period
        let statementYear = new Date().getFullYear();
        const statementPeriodMatch = text.match(this.patterns.statementPeriod);
        if (statementPeriodMatch) {
            statementYear = parseInt(statementPeriodMatch[3]);
            console.log(`📅 Statement year: ${statementYear}`);
        }

        // Step 4: Convert to final format with proper dates and categorization
        const finalTransactions = await Promise.all(allTransactions.map(async t => {
            const month = this.monthMap[t.month];
            const day = parseInt(t.day);
            
            // Handle year boundary cases
            let transactionYear = statementYear;
            if (statementPeriodMatch) {
                const [, startDate, endDate] = statementPeriodMatch;
                const startMonth = this.monthMap[startDate.split(' ')[0]];
                const endMonth = this.monthMap[endDate.split(' ')[0]];
                
                if (startMonth > endMonth && month > endMonth) {
                    transactionYear = statementYear - 1;
                }
            }
            
            const date = new Date(transactionYear, month - 1, day);
            
            // Categorize transaction
            const category = await this.financialCalculator.categorizeTransaction(t.description);
            
            return {
                date: date.toISOString(),
                description: t.description,
                amount: t.amount,
                cardholder: t.cardholder,
                category: category
            };
        }));

        // Extract balance and payment info
        const balanceMatch = text.match(this.patterns.balance);
        const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;

        const paymentMatch = text.match(this.patterns.payment);
        const payment = paymentMatch ? parseFloat(paymentMatch[1].replace(/,/g, '')) : null;

        console.log(`✅ AMEX parsing complete: ${finalTransactions.length} transactions found`);

        return {
            transactions: finalTransactions,
            balance,
            payment,
            totalExpenses: finalTransactions.reduce((sum, t) => sum + t.amount, 0),
            transactionCount: finalTransactions.length
        };
    }

    parseTransactionSection(sectionText, cardholderName) {
        const transactions = [];
        
        // Remove page headers and footers that might interfere
        let cleanText = sectionText;
        cleanText = cleanText.replace(/Page\s+\d+\s+of\s+\d+/g, '');
        cleanText = cleanText.replace(/American Express.*?Card/g, '');
        cleanText = cleanText.replace(/Statement of Account/g, '');
        
        const lines = cleanText.split('\n');
        // Updated pattern to handle both "April17" and "April 17" formats
        const monthPattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2})$/;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if this line is a date line
            const monthDayMatch = line.match(monthPattern);
            
            if (monthDayMatch) {
                const [, month, day] = monthDayMatch;
                
                // Look at the next lines to collect description and find amount
                let description = '';
                let amount = null;
                let nextLineIndex = i + 1;
                let foundValidTransaction = false;
                let isCreditAmount = false;
                let descriptionLines = [];
                
                // Collect lines until we find an amount or another date
                while (nextLineIndex < lines.length && nextLineIndex < i + 10) {
                    const nextLine = lines[nextLineIndex].trim();
                    
                    // Skip empty lines
                    if (nextLine.length === 0) {
                        nextLineIndex++;
                        continue;
                    }
                    
                    // Check if this line is another date (start of next transaction)
                    if (nextLine.match(monthPattern)) {
                        break;
                    }
                    
                    // Check if this is an amount (regular, negative, or with CR)
                    const regularAmountMatch = nextLine.match(/^(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/);
                    const crAmountMatch = nextLine.match(/^(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/);
                    
                    // Check if the line after the amount is "CR"
                    let isNextLineCR = false;
                    if (crAmountMatch && nextLineIndex + 1 < lines.length) {
                        const lineAfterAmount = lines[nextLineIndex + 1].trim();
                        if (lineAfterAmount === 'CR') {
                            isNextLineCR = true;
                        }
                    }
                    
                    if (regularAmountMatch && !isNextLineCR) {
                        amount = regularAmountMatch[1];
                        description = descriptionLines.join(' ').trim();
                        foundValidTransaction = true;
                        break;
                    } else if (crAmountMatch && isNextLineCR) {
                        amount = crAmountMatch[1];
                        isCreditAmount = true;
                        description = descriptionLines.join(' ').trim();
                        foundValidTransaction = true;
                        nextLineIndex++; // Skip the "CR" line
                        break;
                    }
                    
                    // Skip obvious header/footer lines
                    if (nextLine.includes('Card Number') ||
                        nextLine.includes('Page ') ||
                        nextLine.includes('American Express') ||
                        nextLine.includes('Statement of Account') ||
                        nextLine.includes('Prepared for') ||
                        nextLine.includes('Please check all transactions') ||
                        nextLine.includes('PAYMENT RECEIVED') ||
                        nextLine.includes('PayID Payment') ||
                        nextLine.includes('THANKYOU') ||
                        nextLine.startsWith('Total of New') ||
                        nextLine.startsWith('Total of Other') ||
                        nextLine === 'CR' ||  // Skip standalone CR lines
                        nextLine.length < 3) {
                        nextLineIndex++;
                        continue;
                    }
                    
                    // Otherwise, it's part of the description
                    descriptionLines.push(nextLine);
                    nextLineIndex++;
                }
                
                // Filter: Skip payment received transactions
                if (foundValidTransaction && description.length > 0 && 
                    !description.includes('PAYMENT RECEIVED') &&
                    !description.includes('PayID Payment') &&
                    !description.includes('THANKYOU')) {
                    
                    // Convert CR amounts to negative
                    let finalAmount = parseFloat(amount.replace(/,/g, ''));
                    if (isCreditAmount) {
                        finalAmount = -finalAmount;
                        console.log(`💳 CR: ${month} ${day} | ${description} | ${amount} CR -> $${finalAmount}`);
                    }
                    
                    transactions.push({
                        month,
                        day,
                        description: description.trim(),
                        amount: finalAmount,
                        cardholder: cardholderName
                    });
                }
            }
        }
        
        return transactions;
    }
}

module.exports = AmexParser;