const fs = require('fs-extra');
const pdf = require('pdf-parse');
const path = require('path');
const AmexParser = require('./amexParser');
const CitiParser = require('./citiParser');
const PayslipParser = require('./payslipParser');

class PDFParser {
    constructor(database = null) {
        this.database = database;
        // Initialize dedicated parsers with database for categorization
        this.amexParser = new AmexParser(database);
        this.citiParser = new CitiParser(database);
        this.payslipParser = new PayslipParser(database);
    }

    async parsePDF(filePath, retryCount = 0) {
        const maxRetries = 3;
        
        try {
            // Validate file exists and has reasonable size
            const stats = await fs.stat(filePath);
            if (stats.size === 0) {
                throw new Error('File is empty');
            }
            if (stats.size > 50 * 1024 * 1024) { // 50MB limit
                throw new Error('File too large (>50MB)');
            }
            
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer, {
                // PDF parse options for better reliability
                max: 0, // No page limit
                version: 'v1.10.100'
            });
            
            if (!data || !data.text) {
                throw new Error('PDF parsing returned no text content');
            }
            
            const fileName = path.basename(filePath);
            const fileType = this.detectFileType(fileName);
            
            return await this.extractData(data.text, fileType, fileName);
        } catch (error) {
            console.error(`Error parsing PDF (attempt ${retryCount + 1}):`, error);
            
            // Retry logic for transient errors
            if (retryCount < maxRetries && this.isRetryableError(error)) {
                console.log(`Retrying PDF parse in ${(retryCount + 1) * 1000}ms...`);
                await this.delay((retryCount + 1) * 1000);
                return this.parsePDF(filePath, retryCount + 1);
            }
            
            // Return a structured error response instead of throwing
            return {
                fileName: path.basename(filePath),
                fileType: this.detectFileType(path.basename(filePath)),
                parseDate: new Date().toISOString(),
                error: error.message,
                data: null
            };
        }
    }
    
    isRetryableError(error) {
        const retryableErrors = ['EBUSY', 'EMFILE', 'ENFILE', 'EAGAIN'];
        return retryableErrors.some(code => error.code === code || error.message.includes(code));
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    detectFileType(fileName) {
        if (fileName.includes('amex')) return 'amex';
        if (fileName.includes('citi')) return 'citi';
        if (fileName.includes('payslip')) return 'payslip';
        return 'unknown';
    }

    async extractData(text, fileType, fileName) {
        const result = {
            fileName,
            fileType,
            parseDate: new Date().toISOString(),
            data: {}
        };

        switch (fileType) {
            case 'amex':
                result.data = await this.amexParser.extractAmexStatement(text);
                break;
            case 'citi':
                result.data = await this.citiParser.extractCitiStatement(text);
                break;
            case 'payslip':
                result.data = this.payslipParser.extractPayslip(text);
                break;
            default:
                // Try to detect format automatically
                result.data = await this.extractGenericStatement(text);
        }

        return result;
    }


    async extractGenericStatement(text) {
        // Try both AMEX and Citi patterns using dedicated parsers
        const amexResult = await this.amexParser.extractAmexStatement(text);
        const citiResult = await this.citiParser.extractCitiStatement(text);

        // Return the result with more transactions
        return amexResult.transactions.length > citiResult.transactions.length ? amexResult : citiResult;
    }


    async processUploadsFolder(uploadsPath, forceRefresh = false) {
        const results = [];
        const errors = [];
        let skippedCount = 0;
        
        try {
            const folders = ['bank-statements', 'payslips'];
            
            for (const folder of folders) {
                const folderPath = path.join(uploadsPath, folder);
                
                if (!await fs.pathExists(folderPath)) {
                    console.warn(`⚠️  Folder not found: ${folderPath}`);
                    continue;
                }
                
                const files = await fs.readdir(folderPath);
                const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
                
                console.log(`📁 Processing ${pdfFiles.length} PDF files in ${folder}/`);
                
                for (const file of pdfFiles) {
                    const filePath = path.join(folderPath, file);
                    
                    // Check if file was already processed (unless force refresh)
                    if (!forceRefresh && this.database) {
                        const isProcessed = await this.database.isFileProcessed(file);
                        if (isProcessed) {
                            console.log(`⏭️  Skipping already processed file: ${file}`);
                            skippedCount++;
                            continue;
                        }
                    }
                    
                    try {
                        const result = await this.parsePDF(filePath);
                        if (result && result.data) {
                            results.push(result);
                            console.log(`✅ Successfully parsed: ${file}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error parsing ${file}:`, error.message);
                        errors.push({
                            file: file,
                            error: error.message,
                            folder: folder
                        });
                    }
                }
            }
            
            console.log(`📊 Processing summary: ${results.length} new files parsed, ${skippedCount} files skipped (already processed), ${errors.length} errors`);
            
            // Return just the results array for backward compatibility
            return results;
            
        } catch (error) {
            console.error('❌ Error processing uploads folder:', error);
            return [];
        }
    }
}

module.exports = PDFParser;