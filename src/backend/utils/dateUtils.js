/**
 * Date Utilities for Financial Parsers
 * 
 * Provides standardized date creation for Australian timezone (UTC+10)
 * to ensure consistent date handling across all parsers.
 */

class DateUtils {
    /**
     * Create a date in Australian timezone (UTC+10) for database storage
     * This ensures dates are stored consistently regardless of server timezone
     * 
     * @param {number} year - Full year (e.g., 2025)
     * @param {number} month - Month (1-12)
     * @param {number} day - Day of month
     * @param {number} hour - Hour (0-23), defaults to 12 (noon)
     * @returns {Date} Date object in Australian timezone
     */
    static createAustralianDate(year, month, day, hour = 12) {
        // Create ISO string in Australian timezone format
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const timeString = `${String(hour).padStart(2, '0')}:00:00`;
        
        // Create date with explicit Australian timezone offset
        return new Date(`${dateString}T${timeString}+10:00`);
    }
    
    /**
     * Parse a date string in DD.MM.YYYY or DD/MM/YYYY format to Australian timezone
     * 
     * @param {string} dateString - Date string in DD.MM.YYYY or DD/MM/YYYY format
     * @returns {Date|null} Date object in Australian timezone or null if invalid
     */
    static parseAustralianDate(dateString) {
        if (!dateString) return null;
        
        // Handle both DD.MM.YYYY and DD/MM/YYYY formats
        const parts = dateString.split(/[\.\/]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            // Validate parsed values
            if (isNaN(day) || isNaN(month) || isNaN(year) || 
                day < 1 || day > 31 || month < 1 || month > 12) {
                return null;
            }
            
            return this.createAustralianDate(year, month, day);
        }
        
        return null;
    }
    
    /**
     * Convert a date to ISO string for database storage
     * 
     * @param {Date} date - Date object
     * @returns {string} ISO string for database storage
     */
    static toISOString(date) {
        return date.toISOString();
    }
}

module.exports = DateUtils;