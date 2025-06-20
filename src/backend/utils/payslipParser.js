const fs = require('fs-extra');
const pdf = require('pdf-parse');

class PayslipParser {
    constructor(database = null) {
        // Payslip patterns (Deloitte format) - Updated to match actual format
        this.patterns = {
            // Pay period: "01.06.2025 to 30.06.2025"
            payPeriod: /(\d{1,2}\.\d{1,2}\.\d{4})\s+to\s+(\d{1,2}\.\d{1,2}\.\d{4})/i,
            
            // Total Gross: "Total Gross   9,715.99"
            grossPay: /Total\s+Gross\s+([\d,]+\.?\d{0,2})/i,
            
            // Net Pay: "Net Pay   7,031.99"
            netPay: /Net\s+Pay\s+([\d,]+\.?\d{0,2})/i,
            
            // Tax: "Tax   2,184.00-" or "Full Income tax   2,184.00-"
            tax: /(?:Tax|Full\s+Income\s+tax)\s+([\d,]+\.?\d{0,2})/i,
            
            // Superannuation: Look for AustralianSuper entries (first one is employer contribution)
            superannuation: /AustralianSuperMember\s+No:\s+\d+\s+([\d,]+\.?\d{0,2})/i,
            
            // Additional patterns for comprehensive payslip parsing
            employeeName: /Name:\s*([A-Za-z\s]+)/i,
            employeeId: /Personnel\s+Number:\s*(\d+)/i,
            payDate: /Pay\s+Date:\s*(\d{1,2}\.\d{1,2}\.\d{4})/i,
            baseSalary: /Base\s+Salary\s+([\d,]+\.?\d{0,2})/i,
            overtime: /Overtime.*?([\d,]+\.?\d{0,2})/i,
            allowances: /Allowance.*?([\d,]+\.?\d{0,2})/i,
            deductions: /Deductions?\s+Bef\.Tax\s+([\d,]+\.?\d{0,2})/i
        };
    }

    async parsePDF(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            
            return this.extractPayslip(data.text);
        } catch (error) {
            console.error('Error parsing Payslip PDF:', error);
            throw new Error(`Failed to parse Payslip PDF: ${error.message}`);
        }
    }

    extractPayslip(text) {
        console.log('🔍 Enhanced Payslip Parser - Processing payslip...');
        
        // Extract basic payslip information
        const payPeriodMatch = text.match(this.patterns.payPeriod);
        const grossPayMatch = text.match(this.patterns.grossPay);
        const netPayMatch = text.match(this.patterns.netPay);
        const taxMatch = text.match(this.patterns.tax);
        const superMatch = text.match(this.patterns.superannuation);
        
        // Extract additional information
        const employeeNameMatch = text.match(this.patterns.employeeName);
        const employeeIdMatch = text.match(this.patterns.employeeId);
        const payDateMatch = text.match(this.patterns.payDate);
        const basePayMatch = text.match(this.patterns.baseSalary);
        const overtimeMatch = text.match(this.patterns.overtime);
        const allowancesMatch = text.match(this.patterns.allowances);
        const deductionsMatch = text.match(this.patterns.deductions);

        // Parse pay period
        let payPeriod = null;
        if (payPeriodMatch) {
            payPeriod = {
                start: this.parseDate(payPeriodMatch[1]),
                end: this.parseDate(payPeriodMatch[2])
            };
        }

        // Parse amounts with proper error handling
        const parseAmount = (match) => {
            if (!match) return 0;
            const amount = parseFloat(match[1].replace(/,/g, ''));
            return isNaN(amount) ? 0 : amount;
        };

        const result = {
            // Basic information
            employeeName: employeeNameMatch ? employeeNameMatch[1].trim() : null,
            employeeId: employeeIdMatch ? employeeIdMatch[1].trim() : null,
            payDate: payDateMatch ? this.parseDate(payDateMatch[1]) : null,
            payPeriod: payPeriod,
            
            // Financial breakdown
            grossPay: parseAmount(grossPayMatch),
            netPay: parseAmount(netPayMatch),
            basePay: parseAmount(basePayMatch),
            overtime: parseAmount(overtimeMatch),
            allowances: parseAmount(allowancesMatch),
            
            // Deductions
            tax: parseAmount(taxMatch),
            superannuation: parseAmount(superMatch),
            totalDeductions: parseAmount(deductionsMatch),
            
            // Calculated fields
            totalEarnings: 0,
            totalTax: 0
        };

        // Calculate total earnings
        result.totalEarnings = result.basePay + result.overtime + result.allowances;
        
        // Calculate total tax (tax + super + other deductions)
        result.totalTax = result.tax + result.superannuation + result.totalDeductions;

        console.log(`✅ Payslip parsing complete`);
        console.log(`   Employee: ${result.employeeName || 'Unknown'}`);
        console.log(`   Pay Period: ${payPeriod ? `${payPeriod.start} to ${payPeriod.end}` : 'Unknown'}`);
        console.log(`   Gross Pay: $${result.grossPay.toFixed(2)}`);
        console.log(`   Net Pay: $${result.netPay.toFixed(2)}`);
        console.log(`   Tax: $${result.tax.toFixed(2)}`);
        console.log(`   Superannuation: $${result.superannuation.toFixed(2)}`);

        return result;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle both DD.MM.YYYY and DD/MM/YYYY formats
        const parts = dateStr.split(/[\.\/]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
            const year = parseInt(parts[2]);
            return new Date(year, month, day).toISOString();
        }
        return null;
    }

    // Method to extract detailed pay items (for future enhancement)
    extractPayItems(text) {
        const payItems = [];
        
        // This could be enhanced to extract line-by-line pay items
        // For now, return basic structure
        
        return payItems;
    }

    // Method to validate payslip data
    validatePayslip(payslipData) {
        const errors = [];
        
        if (!payslipData.payPeriod) {
            errors.push('Pay period not found');
        }
        
        if (payslipData.grossPay <= 0) {
            errors.push('Invalid gross pay amount');
        }
        
        if (payslipData.netPay <= 0) {
            errors.push('Invalid net pay amount');
        }
        
        if (payslipData.grossPay < payslipData.netPay) {
            errors.push('Net pay cannot be greater than gross pay');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = PayslipParser;