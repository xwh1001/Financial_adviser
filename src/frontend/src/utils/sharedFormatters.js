/**
 * Frontend formatting utilities - identical to backend shared formatters
 * Duplicated here to avoid require/import compatibility issues between Node.js and browser
 */

export const formatCurrency = (amount, currency = 'AUD', locale = 'en-AU') => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatPercentage = (value, decimals = 1) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.0%';
  }

  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatDate = (date, format = 'medium') => {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';

  const options = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: '2-digit', month: 'short', year: 'numeric' },
    long: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
  };

  return dateObj.toLocaleDateString('en-AU', options[format] || options.medium);
};

export const formatLargeNumber = (value, decimals = 1) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  }

  return value.toString();
};

export const formatTransactionDescription = (description, maxLength = 50) => {
  if (!description) return 'Unknown Transaction';

  let cleaned = description
    .replace(/\s+/g, ' ')
    .replace(/\*/g, '')
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + '...';
  }

  return cleaned;
};

export const formatCategoryName = (category) => {
  if (!category) return 'Other';

  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
};

export const formatDuration = (months) => {
  if (!months || months < 1) return 'Less than a month';

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
  } else if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  } else {
    const yearStr = years === 1 ? '1 year' : `${years} years`;
    const monthStr = remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
    return `${yearStr} ${monthStr}`;
  }
};