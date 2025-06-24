const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const multer = require('multer');
const fs = require('fs-extra');
require('dotenv').config();

const Database = require('./database');
const PDFParser = require('./utils/pdfParser');
const FinancialCalculator = require('./utils/financialCalculator');
const CustomCategoryManager = require('./utils/customCategories');
const FatherCategoryManager = require('./utils/fatherCategories');
const FinancialInsightsEngine = require('./utils/insightsEngine');
const CategoryRuleBackupManager = require('./utils/categoryRuleBackup');
const UserDataManager = require('./utils/userDataManager');
const errorHandler = require('./middleware/errorHandler');
const Formatters = require('../shared/utils/formatters');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database and utilities
const db = new Database();
const pdfParser = new PDFParser(db);
const calculator = new FinancialCalculator(db);
const customCategoryManager = new CustomCategoryManager();
const fatherCategoryManager = new FatherCategoryManager();
const insightsEngine = new FinancialInsightsEngine(db);
const categoryBackupManager = new CategoryRuleBackupManager(db, customCategoryManager);
const userDataManager = new UserDataManager(db, customCategoryManager);

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../temp/'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (increased)
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "script-src-attr": ["'unsafe-inline'"]
    }
  }
}));

// Request logging and ID assignment
app.use(errorHandler.requestLogger);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve React build files in production only
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Financial Dashboard API is running' });
});

// Get existing files organized by month
app.get('/api/files/existing', errorHandler.asyncHandler(async (req, res) => {
  const uploadsPath = path.join(__dirname, '../../uploads');
  
  try {
    if (!await fs.pathExists(uploadsPath)) {
      return res.json({ files: [] });
    }

    const files = [];
    const categories = ['bank-statements', 'payslips', 'receipts', 'tax-documents', 'other'];
    
    for (const category of categories) {
      const categoryPath = path.join(uploadsPath, category);
      if (await fs.pathExists(categoryPath)) {
        const categoryFiles = await fs.readdir(categoryPath);
        
        for (const filename of categoryFiles) {
          if (filename.toLowerCase().endsWith('.pdf')) {
            const filePath = path.join(categoryPath, filename);
            const stats = await fs.stat(filePath);
            
            // Extract month from filename or use file date
            const month = extractMonthFromFilename(filename) || 
                         stats.mtime.toISOString().substring(0, 7);
            
            files.push({
              name: filename,
              category,
              month,
              size: stats.size,
              uploadDate: stats.mtime
            });
          }
        }
      }
    }
    
    res.json({ files });
  } catch (error) {
    console.error('Error reading existing files:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading existing files',
      error: error.message
    });
  }
}));

// Helper function to extract month from filename
function extractMonthFromFilename(filename) {
  // Try to extract date patterns from various filename formats
  const datePatterns = [
    // ISO date formats: 2025-05-16_amex-statement
    /(\d{4})[-_.](\d{2})[-_.]\d{2}/,           // 2025-05-16_amex-statement (capture year and month)
    
    // Year-Month formats: 202405, 2024-05, 2024_05
    /(\d{4})[-_.]?(\d{2})/,                   // 202405, 2024-05, 2024_05
    
    // Month Year formats: May2024, May_2024, May-2024
    /(\w{3,9})[-_.]\s*(\d{4})/,               // May-2024, January_2024
    /(\w{3,9})\s*(\d{4})/,                    // May2024, January2024
    
    // Reverse formats: 2024-May, 2024_January
    /(\d{4})[-_.]\s*(\w{3,9})/,               // 2024-May, 2024_January
    
    // Date with day: 16-05-2024, 16_05_2024
    /\d{1,2}[-_.](\d{2})[-_.](\d{4})/,        // 16-05-2024
    
    // Just year-month: 24-05, 24_05 (assuming 20xx)
    /^(\d{2})[-_.](\d{2})/                    // 24-05 (convert to 2024-05)
  ];

  const monthNames = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  };

  for (let i = 0; i < datePatterns.length; i++) {
    const pattern = datePatterns[i];
    const match = filename.match(pattern);
    
    if (match) {
      try {
        let year = null;
        let month = null;

        switch (i) {
          case 0: // 2025-05-16_amex-statement (capture year and month)
          case 1: // 202405, 2024-05, 2024_05
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            break;
            
          case 2: // May-2024, January_2024
          case 3: // May2024, January2024
            const monthName = match[1].toLowerCase();
            month = monthNames[monthName];
            year = parseInt(match[2]);
            break;
            
          case 4: // 2024-May, 2024_January
            year = parseInt(match[1]);
            const monthName2 = match[2].toLowerCase();
            month = monthNames[monthName2];
            break;
            
          case 5: // 16-05-2024
            month = parseInt(match[1]);
            year = parseInt(match[2]);
            break;
            
          case 6: // 24-05 (assume 20xx)
            year = 2000 + parseInt(match[1]);
            month = parseInt(match[2]);
            break;
        }
        
        // Validate extracted date
        if (year && month && year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
          console.log(`📅 Backend extracted date from "${filename}": ${year}-${month.toString().padStart(2, '0')}`);
          return `${year}-${month.toString().padStart(2, '0')}`;
        }
      } catch (e) {
        console.warn(`⚠️ Backend error parsing date from "${filename}":`, e);
        continue;
      }
    }
  }
  
  console.warn(`⚠️ Backend could not extract date from filename: "${filename}"`);
  return null;
}

// Upload files endpoint
app.post('/api/upload-files', upload.array('files', 20), errorHandler.asyncHandler(async (req, res) => {
  const { categories, estimatedMonths } = req.body;
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }

  const uploadsPath = path.join(__dirname, '../../uploads');
  await fs.ensureDir(uploadsPath);

  let uploadedCount = 0;
  const uploadedFiles = [];
  const errors = [];

  try {
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const category = Array.isArray(categories) ? categories[i] : categories;
      const estimatedMonth = Array.isArray(estimatedMonths) ? estimatedMonths[i] : estimatedMonths;
      
      try {
        // Ensure category directory exists
        const categoryPath = path.join(uploadsPath, category || 'other');
        await fs.ensureDir(categoryPath);
        
        // Generate unique filename if needed
        let filename = file.originalname;
        let counter = 1;
        let finalPath = path.join(categoryPath, filename);
        
        while (await fs.pathExists(finalPath)) {
          const nameWithoutExt = path.parse(filename).name;
          const ext = path.parse(filename).ext;
          filename = `${nameWithoutExt}_${counter}${ext}`;
          finalPath = path.join(categoryPath, filename);
          counter++;
        }
        
        // Move file from temp location to final destination
        await fs.move(file.path, finalPath);
        
        uploadedFiles.push({
          originalName: file.originalname,
          filename,
          category: category || 'other',
          estimatedMonth,
          size: file.size
        });
        
        uploadedCount++;
        console.log(`✅ Uploaded: ${filename} to ${category || 'other'}`);
        
      } catch (fileError) {
        console.error(`❌ Error uploading ${file.originalname}:`, fileError);
        errors.push({
          filename: file.originalname,
          error: fileError.message
        });
        
        // Clean up temp file if it still exists
        try {
          await fs.remove(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      }
    }

    // Process uploaded files immediately
    console.log(`🔄 Processing ${uploadedCount} newly uploaded files...`);
    
    // Process the uploaded files
    const processResult = await processUploadedFiles(uploadsPath, uploadedFiles);
    
    res.json({
      success: true,
      message: `Successfully uploaded and processed ${uploadedCount} files`,
      filesUploaded: uploadedCount,
      uploadedFiles,
      processedData: processResult,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing uploads',
      error: error.message,
      partialSuccess: uploadedCount > 0 ? {
        filesUploaded: uploadedCount,
        uploadedFiles
      } : undefined
    });
  }
}));

// Helper function to process uploaded files
async function processUploadedFiles(uploadsPath, uploadedFiles) {
  try {
    // Get only the files that were just uploaded
    const filesToProcess = uploadedFiles.map(f => 
      path.join(uploadsPath, f.category, f.filename)
    );
    
    let parsedData = [];
    let successfulFiles = 0;
    
    // Process each uploaded file
    for (const uploadedFile of uploadedFiles) {
      try {
        const filePath = path.join(uploadsPath, uploadedFile.category, uploadedFile.filename);
        const fileData = await pdfParser.processSingleFile(filePath, uploadedFile.filename);
        
        if (fileData) {
          parsedData.push(fileData);
          
          // Save to database
          if (fileData.fileType === 'payslip' && fileData.data?.grossPay) {
            await db.saveIncome(fileData.data, fileData.fileName);
            successfulFiles++;
          } else if ((fileData.fileType === 'amex' || fileData.fileType === 'citi') 
                     && fileData.data?.transactions) {
            const categorizedTransactions = await Promise.all(
              fileData.data.transactions.map(async (t) => ({
                ...t,
                category: await calculator.categorizeTransaction(t.description) || 'OTHER',
                account_type: fileData.fileType
              }))
            );
            
            await db.saveTransactions(categorizedTransactions, fileData.fileName);
            successfulFiles++;
          }
          
          await db.markFileProcessed(fileData.fileName, fileData.fileType);
        }
      } catch (fileError) {
        console.error(`Error processing ${uploadedFile.filename}:`, fileError);
      }
    }
    
    // Calculate monthly summaries if we have data
    if (parsedData.length > 0) {
      try {
        const { monthlyData } = await calculator.calculateMonthlyData(parsedData);
        for (const monthData of monthlyData) {
          await db.saveMonthlySummary(monthData);
        }
      } catch (summaryError) {
        console.error('Error calculating monthly summaries:', summaryError);
      }
    }
    
    return {
      parsedFiles: parsedData.length,
      savedFiles: successfulFiles
    };
    
  } catch (error) {
    console.error('Error in processUploadedFiles:', error);
    throw error;
  }
}

// Process all uploaded files
app.post('/api/process-files', errorHandler.asyncHandler(async (req, res) => {
  const uploadsPath = path.join(__dirname, '../../uploads');
  console.log('Processing files in:', uploadsPath);
  
  // Verify uploads directory exists
  if (!await fs.pathExists(uploadsPath)) {
    return res.status(404).json({
      success: false,
      message: 'Uploads directory not found',
      error: 'UPLOADS_DIR_NOT_FOUND'
    });
  }
  
  let parsedData = [];
  let failedFiles = [];
  let successfulFiles = 0;
  
  try {
    parsedData = await pdfParser.processUploadsFolder(uploadsPath, false);
    console.log(`Parsed ${parsedData.length} files`);
  } catch (parseError) {
    console.error('Error during PDF parsing:', parseError);
    // Continue with empty array if parsing fails completely
    parsedData = [];
  }
  
  // Process each file with individual error handling
  for (const fileData of parsedData) {
    try {
      if (fileData.fileType === 'payslip' && fileData.data?.grossPay) {
        await db.saveIncome(fileData.data, fileData.fileName);
        successfulFiles++;
      } else if ((fileData.fileType === 'amex' || fileData.fileType === 'citi') 
                 && fileData.data?.transactions) {
        // Add category to transactions with fallback categorization
        const categorizedTransactions = await Promise.all(
          fileData.data.transactions.map(async (t) => {
            let category = 'OTHER';
            try {
              category = await calculator.categorizeTransaction(t.description) || 'OTHER';
            } catch (categorizationError) {
              console.warn(`Failed to categorize transaction: ${t.description}`, categorizationError);
            }
            
            return {
              ...t,
              category,
              account_type: fileData.fileType
            };
          })
        );
        
        await db.saveTransactions(categorizedTransactions, fileData.fileName);
        successfulFiles++;
      }
      
      await db.markFileProcessed(fileData.fileName, fileData.fileType);
    } catch (fileError) {
      console.error(`Error processing file ${fileData.fileName}:`, fileError);
      failedFiles.push({
        fileName: fileData.fileName,
        error: fileError.message
      });
    }
  }
  
  // Calculate monthly summaries with fallback
  let monthlyDataCount = 0;
  try {
    const { monthlyData } = await calculator.calculateMonthlyData(parsedData);
    
    for (const monthData of monthlyData) {
      try {
        await db.saveMonthlySummary(monthData);
        monthlyDataCount++;
      } catch (summaryError) {
        console.error(`Error saving monthly summary for ${monthData.month}:`, summaryError);
      }
    }
  } catch (calculationError) {
    console.error('Error calculating monthly data:', calculationError);
  }
  
  // Determine response based on results
  const totalFiles = parsedData.length;
  const hasPartialSuccess = successfulFiles > 0;
  const hasFailures = failedFiles.length > 0;
  
  if (totalFiles === 0) {
    return res.json({
      success: true,
      message: 'No new files to process',
      filesProcessed: 0,
      monthlyData: 0
    });
  }
  
  if (hasFailures && !hasPartialSuccess) {
    return res.status(500).json({
      success: false,
      message: 'All files failed to process',
      filesProcessed: 0,
      failedFiles,
      monthlyData: monthlyDataCount
    });
  }
  
  res.json({
    success: true,
    message: hasFailures 
      ? `Processed ${successfulFiles}/${totalFiles} files (${failedFiles.length} failed)`
      : `Processed ${successfulFiles} files successfully`,
    filesProcessed: successfulFiles,
    failedFiles: hasFailures ? failedFiles : undefined,
    monthlyData: monthlyDataCount
  });
}));

// Hard refresh - Clear all processed files and re-process everything
app.post('/api/hard-refresh', async (req, res) => {
  try {
    console.log('🔄 Starting hard refresh - backing up user data and clearing all data...');
    
    // First, backup all user-defined data
    const backupResult = await userDataManager.createAutoBackup();
    console.log(`💾 Created automatic backup: ${backupResult.filename}`);
    
    // Clear all processed files tracking
    await db.clearProcessedFiles();
    
    // Clear all existing transactions and income data (but keep user data tables for now)
    await db.run('DELETE FROM transactions');
    await db.run('DELETE FROM income');
    await db.run('DELETE FROM monthly_summaries');
    console.log('🗑️  Cleared all transaction and income data');
    
    // Re-process all files with force refresh
    const uploadsPath = path.join(__dirname, '../../uploads');
    const parsedData = await pdfParser.processUploadsFolder(uploadsPath, true);
    console.log(`📁 Re-parsed ${parsedData.length} files`);
    
    // Save to database
    for (const fileData of parsedData) {
      if (fileData.fileType === 'payslip' && fileData.data.grossPay) {
        await db.saveIncome(fileData.data, fileData.fileName);
      } else if ((fileData.fileType === 'amex' || fileData.fileType === 'citi') 
                 && fileData.data.transactions) {
        // Add category to transactions
        const categorizedTransactions = await Promise.all(
          fileData.data.transactions.map(async (t) => ({
            ...t,
            category: await calculator.categorizeTransaction(t.description),
            account_type: fileData.fileType
          }))
        );
        
        await db.saveTransactions(categorizedTransactions, fileData.fileName);
      }
      
      await db.markFileProcessed(fileData.fileName, fileData.fileType);
    }
    
    // Calculate monthly summaries
    const { monthlyData, incomeData } = await calculator.calculateMonthlyData(parsedData);
    
    for (const monthData of monthlyData) {
      await db.saveMonthlySummary(monthData);
    }
    
    // Restore user-defined data from the backup
    console.log('🔄 Restoring user-defined data...');
    const restoreResult = await userDataManager.importUserData(backupResult.filename);
    console.log(`✅ Restored user data: ${JSON.stringify(restoreResult.stats)}`);
    
    console.log('✅ Hard refresh completed successfully with data restoration');
    
    res.json({
      success: true,
      message: `Hard refresh completed successfully! Re-processed ${parsedData.length} files and restored user data.`,
      filesProcessed: parsedData.length,
      monthlyData: monthlyData.length,
      backupCreated: backupResult.filename,
      userDataRestored: restoreResult.stats
    });
    
  } catch (error) {
    console.error('Error during hard refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Error during hard refresh',
      error: error.message
    });
  }
});

// User Data Management Endpoints
app.post('/api/user-data/export', async (req, res) => {
  try {
    const result = await userDataManager.exportUserData();
    res.json({
      success: true,
      message: 'User data exported successfully',
      ...result
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting user data',
      error: error.message
    });
  }
});

app.post('/api/user-data/import', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    const result = await userDataManager.importUserData(filename);
    res.json({
      success: true,
      message: 'User data imported successfully',
      ...result
    });
  } catch (error) {
    console.error('Error importing user data:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing user data',
      error: error.message
    });
  }
});

app.get('/api/user-data/backups', async (req, res) => {
  try {
    const backups = await userDataManager.listBackups();
    res.json({
      success: true,
      backups
    });
  } catch (error) {
    console.error('Error listing user data backups:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing backups',
      error: error.message
    });
  }
});

app.delete('/api/user-data/backups/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    await userDataManager.deleteBackup(filename);
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting backup',
      error: error.message
    });
  }
});

// Get financial dashboard data
app.get('/api/dashboard', errorHandler.asyncHandler(async (req, res) => {
  let ytdData = null;
  let allData = null;
  let recentTransactions = [];
  
  // Fetch YTD data for income/expenses calculations
  try {
    ytdData = await db.getYTDSummary();
  } catch (ytdError) {
    console.warn('Failed to fetch YTD summary, using fallback:', ytdError);
    ytdData = { monthlySummaries: [], transactions: [] };
  }
  
  // Fetch ALL data for Categories tab year selection
  try {
    allData = await db.getAllDataSummary();
  } catch (dataError) {
    console.warn('Failed to fetch all data summary, using fallback:', dataError);
    allData = { monthlySummaries: [], transactions: [] };
  }
  
  try {
    recentTransactions = await db.getRecentTransactions(20);
  } catch (transactionError) {
    console.warn('Failed to fetch recent transactions, using fallback:', transactionError);
    recentTransactions = [];
  }
  
  // Use YTD data for income/expenses calculations (for dashboard totals)
  const ytdMonthlySummaries = ytdData.monthlySummaries || [];
  const ytdTransactions = ytdData.transactions || [];
  
  // Use ALL data for Categories tab (monthlyData field)
  const allMonthlySummaries = allData.monthlySummaries || [];
  const allTransactions = allData.transactions || [];
  
  // Calculate YTD totals for dashboard display
  const totalIncome = ytdMonthlySummaries.reduce((sum, month) => sum + (month.total_income || 0), 0);
  const totalExpenses = ytdMonthlySummaries.reduce((sum, month) => sum + (month.total_expenses || 0), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  
  // Use YTD transactions for category breakdown (dashboard display)
  const categoryTotals = {};
  ytdTransactions.forEach(txn => {
    if (txn && txn.category && typeof txn.amount === 'number') {
      categoryTotals[txn.category] = (categoryTotals[txn.category] || 0) + txn.amount;
    }
  });
  
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);
  
  // Provide default values for missing data
  const defaultSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    totalBalance: 0,
    netWorth: 0
  };
  
  res.json({
    summary: {
      totalIncome: totalIncome || defaultSummary.totalIncome,
      totalExpenses: totalExpenses || defaultSummary.totalExpenses,
      netSavings: netSavings || defaultSummary.netSavings,
      savingsRate: isFinite(savingsRate) ? savingsRate : defaultSummary.savingsRate,
      totalBalance: 25000, // This would come from bank balance parsing
      netWorth: 75000 // This would be calculated from assets
    },
    categoryBreakdown, // YTD category breakdown for dashboard
    recentTransactions: (recentTransactions || []).slice(0, 10),
    monthlyData: allMonthlySummaries, // ALL monthly data for Categories tab year selection
    hasData: ytdTransactions.length > 0 || ytdMonthlySummaries.length > 0
  });
}));

// Get YTD analysis
app.get('/api/ytd-analysis', async (req, res) => {
  try {
    const uploadsPath = path.join(__dirname, '../../uploads');
    const parsedData = await pdfParser.processUploadsFolder(uploadsPath);
    
    const { monthlyData, incomeData } = await calculator.calculateMonthlyData(parsedData);
    const ytdSummary = calculator.calculateYTDSummary(monthlyData, incomeData);
    const projections = calculator.calculateProjections(ytdSummary);
    const insights = calculator.generateInsights(ytdSummary, monthlyData);
    
    res.json({
      ytdSummary,
      monthlyBreakdown: monthlyData,
      projections,
      insights
    });
    
  } catch (error) {
    console.error('Error generating YTD analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating YTD analysis',
      error: error.message
    });
  }
});

// Get personalized financial insights
app.get('/api/insights', errorHandler.asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || 'lastmonth';
  const userTimezone = req.query.userTimezone || 'Australia/Sydney'; // Default to Australian timezone
  const userDate = req.query.userDate; // Current date in user's timezone (YYYY-MM-DD format)
  
  // Get user's location settings for ABS benchmarks
  const userLocation = await db.getUserSetting('user_location') || 'victoria';
  const userCity = await db.getUserSetting('user_city') || 'melbourne';
  
  console.log(`🔍 Generating insights for timeframe: ${timeframe}, location: ${userLocation}, city: ${userCity}, timezone: ${userTimezone}, date: ${userDate}`);
  
  const insights = await insightsEngine.generatePersonalizedInsights(timeframe, userTimezone, userDate, userLocation, userCity);
  
  res.json({
    success: true,
    insights,
    generatedAt: new Date().toISOString()
  });
}));

// Get available years from transaction dates
app.get('/api/available-years', errorHandler.asyncHandler(async (req, res) => {
  try {
    // Query the database to get distinct years from transaction dates
    const sql = `
      SELECT DISTINCT SUBSTR(date, 1, 4) as year 
      FROM transactions 
      WHERE date IS NOT NULL AND date != '' AND LENGTH(date) >= 4
      ORDER BY year DESC
    `;
    
    const rows = await db.all(sql);
    
    // Extract years from the query result and convert to integers
    const years = rows
      .map(row => parseInt(row.year))
      .filter(year => !isNaN(year) && year >= 2000 && year <= 2050) // Filter valid years
      .sort((a, b) => b - a); // Sort descending (newest first)
    
    res.json({
      success: true,
      years: years
    });
  } catch (error) {
    console.error('Error fetching available years:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available years',
      error: error.message
    });
  }
}));

// Get monthly categories data
app.post('/api/monthly-categories', async (req, res) => {
  try {
    const { months, year } = req.body;
    
    // If no months specified but year is specified, use YTD for that year
    let filteredMonths = months;
    if ((!months || months.length === 0) && year) {
      // Generate YTD months for the specified year
      const currentMonth = new Date().getMonth(); // 0-based
      const currentYear = new Date().getFullYear();
      
      // If it's the current year, go up to current month; otherwise, use all 12 months
      const monthsToGenerate = (year === currentYear) ? currentMonth + 1 : 12;
      
      filteredMonths = [];
      for (let i = 0; i < monthsToGenerate; i++) {
        filteredMonths.push(`${year}-${String(i + 1).padStart(2, '0')}`);
      }
    }
    
    if (!filteredMonths || !Array.isArray(filteredMonths)) {
      return res.status(400).json({
        success: false,
        message: 'Months array is required'
      });
    }

    // Get transactions for selected months
    const transactions = await db.getTransactionsByMonths(filteredMonths);
    
    // Calculate category totals
    const categoryTotals = {};
    transactions.forEach(txn => {
      categoryTotals[txn.category] = (categoryTotals[txn.category] || 0) + txn.amount;
    });

    const totalSpending = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    const categories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage);

    res.json({
      success: true,
      categories,
      totalSpending,
      transactionCount: transactions.length
    });
    
  } catch (error) {
    console.error('Error fetching monthly categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly categories',
      error: error.message
    });
  }
});

// Get transactions for a specific category
app.get('/api/transactions/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const transactions = await db.getTransactionsByCategory(category);
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching category transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category transactions',
      error: error.message
    });
  }
});

// Get filtered transactions for a specific category and months
app.post('/api/transactions/category-filtered', async (req, res) => {
  try {
    const { category, months, year } = req.body;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Generate months for year if no specific months provided
    let filteredMonths = months;
    if ((!months || months.length === 0) && year) {
      // Generate YTD months for the specified year
      const currentMonth = new Date().getMonth(); // 0-based
      const currentYear = new Date().getFullYear();
      
      // If it's the current year, go up to current month; otherwise, use all 12 months
      const monthsToGenerate = (year === currentYear) ? currentMonth + 1 : 12;
      
      filteredMonths = [];
      for (let i = 0; i < monthsToGenerate; i++) {
        filteredMonths.push(`${year}-${String(i + 1).padStart(2, '0')}`);
      }
    }

    const transactions = await db.getTransactionsByCategoryAndMonths(category, filteredMonths || []);
    
    res.json({
      success: true,
      transactions,
      category,
      months,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching filtered category transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching filtered category transactions',
      error: error.message
    });
  }
});

// Update transaction category
app.put('/api/transactions/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    await db.updateTransactionCategory(id, category);
    
    res.json({
      success: true,
      message: 'Transaction category updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction category',
      error: error.message
    });
  }
});

// Get all available categories
app.get('/api/categories', async (req, res) => {
  try {
    // Get current custom categories (which includes any user-added categories)
    const customCategories = await customCategoryManager.getCustomCategories();
    const categoryNames = Object.keys(customCategories).sort();
    
    res.json(categoryNames);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Get COICOP-aligned category structure
app.get('/api/categories/coicop', errorHandler.asyncHandler(async (req, res) => {
  try {
    const coicopStructure = customCategoryManager.getCOICOPStructure();
    const displayNames = customCategoryManager.getCategoryDisplayNames();
    const customCategories = await customCategoryManager.getCustomCategories();
    
    // Add additional metadata for each category
    const enrichedStructure = {};
    
    Object.entries(coicopStructure).forEach(([divisionName, categories]) => {
      enrichedStructure[divisionName] = categories.map(categoryId => ({
        id: categoryId,
        displayName: displayNames[categoryId] || categoryId,
        keywordCount: customCategories[categoryId] ? customCategories[categoryId].length : 0,
        exists: customCategories[categoryId] !== undefined
      }));
    });
    
    res.json({
      success: true,
      structure: enrichedStructure,
      totalCategories: Object.values(coicopStructure).flat().length,
      totalDivisions: Object.keys(coicopStructure).length
    });
  } catch (error) {
    console.error('Error fetching COICOP categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching COICOP categories',
      error: error.message
    });
  }
}));

// Category Migration API
app.post('/api/categories/migrate', errorHandler.asyncHandler(async (req, res) => {
  try {
    const CategoryMigration = require('./utils/categoryMigration');
    const migration = new CategoryMigration(db);
    
    console.log('🚀 Starting category migration to COICOP...');
    const result = await migration.runMigration();
    
    res.json({
      success: true,
      message: 'Category migration completed successfully',
      report: result.report,
      migrationLogCount: result.migrationLog.length
    });
  } catch (error) {
    console.error('❌ Category migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Category migration failed',
      error: error.message
    });
  }
}));

// Migration status and analysis
app.get('/api/categories/migration-analysis', errorHandler.asyncHandler(async (req, res) => {
  try {
    const CategoryMigration = require('./utils/categoryMigration');
    const migration = new CategoryMigration(db);
    
    // Run analysis without actual migration
    const analysis = await migration.analyzeCurrentData();
    
    res.json({
      success: true,
      analysis: analysis,
      migrationNeeded: analysis.categoriesInUse.length > 0
    });
  } catch (error) {
    console.error('Error analyzing migration needs:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing migration needs',
      error: error.message
    });
  }
}));

// Father Categories Management
app.get('/api/father-categories', async (req, res) => {
  try {
    const fatherCategories = await fatherCategoryManager.getFatherCategories();
    res.json(fatherCategories);
  } catch (error) {
    console.error('Error fetching father categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching father categories',
      error: error.message
    });
  }
});

app.get('/api/categories-grouped', async (req, res) => {
  try {
    const grouped = await fatherCategoryManager.getCategoriesGroupedByFather();
    res.json(grouped);
  } catch (error) {
    console.error('Error fetching grouped categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grouped categories',
      error: error.message
    });
  }
});

app.post('/api/category-mapping', async (req, res) => {
  try {
    const { childCategory, fatherCategory } = req.body;
    const success = await fatherCategoryManager.updateCategoryMapping(childCategory, fatherCategory);
    
    if (success) {
      res.json({ success: true, message: 'Category mapping updated successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update category mapping' });
    }
  } catch (error) {
    console.error('Error updating category mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category mapping',
      error: error.message
    });
  }
});

// Category Rules Management
app.get('/api/category-rules', async (req, res) => {
  try {
    const rules = await db.getCategoryRules();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching category rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category rules',
      error: error.message
    });
  }
});

app.post('/api/category-rules', async (req, res) => {
  try {
    const { pattern, category, priority } = req.body;
    await db.saveCategoryRule(pattern, category, priority || 0);
    res.json({ success: true, message: 'Category rule saved successfully' });
  } catch (error) {
    console.error('Error saving category rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving category rule',
      error: error.message
    });
  }
});

app.put('/api/category-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pattern, category, priority, enabled } = req.body;
    await db.updateCategoryRule(id, pattern, category, priority, enabled);
    res.json({ success: true, message: 'Category rule updated successfully' });
  } catch (error) {
    console.error('Error updating category rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category rule',
      error: error.message
    });
  }
});

app.delete('/api/category-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteCategoryRule(id);
    res.json({ success: true, message: 'Category rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting category rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category rule',
      error: error.message
    });
  }
});

// Diagnostic endpoint for category troubleshooting
app.get('/api/diagnostic/categories', async (req, res) => {
  try {
    const customCategories = await customCategoryManager.getCustomCategories();
    const defaultCategories = await customCategoryManager.getDefaultCategoryList();
    const dbRules = await db.getCategoryRules();
    
    // Test categorization with a sample transaction
    const testDescription = req.query.test || 'WOOLWORTHS SUPERMARKET';
    const testResult = await calculator.categorizeTransaction(testDescription);
    
    res.json({
      success: true,
      diagnostic: {
        customCategoriesCount: Object.keys(customCategories).length,
        defaultCategoriesCount: Object.keys(defaultCategories).length,
        dbRulesCount: dbRules.length,
        customCategories: Object.keys(customCategories),
        sampleCustomCategory: Object.entries(customCategories)[0] || null,
        testTransaction: {
          description: testDescription,
          result: testResult
        }
      }
    });
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error running diagnostics',
      error: error.message
    });
  }
});

// Custom Category Management
app.get('/api/custom-categories', async (req, res) => {
  try {
    const categories = await customCategoryManager.getCustomCategories();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching custom categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom categories',
      error: error.message
    });
  }
});

app.get('/api/default-categories', async (req, res) => {
  try {
    const categories = await customCategoryManager.getDefaultCategoryList();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching default categories',
      error: error.message
    });
  }
});

app.post('/api/custom-categories/restore-defaults', async (req, res) => {
  try {
    const success = await customCategoryManager.restoreDefaults();
    if (success) {
      // Re-initialize the calculator with restored categories
      await calculator.refreshCategories();
      res.json({ success: true, message: 'Categories restored to defaults successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to restore defaults' });
    }
  } catch (error) {
    console.error('Error restoring default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring default categories',
      error: error.message
    });
  }
});

app.post('/api/custom-categories/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { keywords } = req.body;
    
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        message: 'Keywords array is required'
      });
    }

    const success = await customCategoryManager.addCategory(categoryName, keywords);
    if (success) {
      // Re-initialize the calculator with updated categories
      await calculator.refreshCategories();
      res.json({ success: true, message: 'Category added successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to add category' });
    }
  } catch (error) {
    console.error('Error adding custom category:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding custom category',
      error: error.message
    });
  }
});

app.put('/api/custom-categories/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { keywords } = req.body;
    
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        message: 'Keywords array is required'
      });
    }

    const success = await customCategoryManager.updateCategory(categoryName, keywords);
    if (success) {
      // Re-initialize the calculator with updated categories
      await calculator.refreshCategories();
      res.json({ success: true, message: 'Category updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error updating custom category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating custom category',
      error: error.message
    });
  }
});

app.delete('/api/custom-categories/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const success = await customCategoryManager.removeCategory(categoryName);
    if (success) {
      // Re-initialize the calculator with updated categories
      await calculator.refreshCategories();
      res.json({ success: true, message: 'Category deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error deleting custom category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting custom category',
      error: error.message
    });
  }
});

app.post('/api/custom-categories/:categoryName/keywords', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { keyword } = req.body;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required'
      });
    }

    const success = await customCategoryManager.addKeywordToCategory(categoryName, keyword);
    if (success) {
      // Re-initialize the calculator with updated categories
      await calculator.refreshCategories();
      res.json({ success: true, message: 'Keyword added successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Category not found or keyword already exists' });
    }
  } catch (error) {
    console.error('Error adding keyword to category:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding keyword to category',
      error: error.message
    });
  }
});

app.delete('/api/custom-categories/:categoryName/keywords/:keyword', async (req, res) => {
  try {
    const { categoryName, keyword } = req.params;
    const success = await customCategoryManager.removeKeywordFromCategory(categoryName, keyword);
    if (success) {
      // Re-initialize the calculator with updated categories
      await calculator.refreshCategories();
      res.json({ success: true, message: 'Keyword removed successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Category or keyword not found' });
    }
  } catch (error) {
    console.error('Error removing keyword from category:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing keyword from category',
      error: error.message
    });
  }
});

// Regenerate monthly summaries from existing database data
app.post('/api/regenerate-summaries', errorHandler.asyncHandler(async (req, res) => {
  try {
    console.log('🔄 API request to regenerate monthly summaries...');
    
    const regeneratedSummaries = await calculator.regenerateMonthlySummariesFromDB();
    
    res.json({
      success: true,
      message: 'Monthly summaries regenerated successfully',
      summariesCount: regeneratedSummaries.length,
      regeneratedMonths: regeneratedSummaries.map(s => s.month)
    });
    
  } catch (error) {
    console.error('Error regenerating monthly summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating monthly summaries',
      error: error.message
    });
  }
}));

// Category Rules Backup & Restore
app.get('/api/category-rules/export', errorHandler.asyncHandler(async (req, res) => {
  try {
    const result = await categoryBackupManager.exportRules();
    
    res.json({
      success: true,
      message: 'Category rules exported successfully',
      filePath: result.filePath,
      stats: {
        rulesCount: result.rulesCount,
        categoriesCount: result.categoriesCount
      }
    });
  } catch (error) {
    console.error('Error exporting category rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting category rules',
      error: error.message
    });
  }
}));

app.post('/api/category-rules/import', errorHandler.asyncHandler(async (req, res) => {
  try {
    const { replaceExisting = false } = req.body;
    const result = await categoryBackupManager.importRules(null, { replaceExisting });
    
    res.json({
      success: true,
      message: 'Category rules imported successfully',
      stats: result.stats
    });
  } catch (error) {
    console.error('Error importing category rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing category rules',
      error: error.message
    });
  }
}));

app.post('/api/category-rules/validate-backup', errorHandler.asyncHandler(async (req, res) => {
  try {
    const result = await categoryBackupManager.importRules(null, { validateOnly: true });
    
    res.json({
      success: true,
      valid: result.valid,
      message: 'Backup file is valid',
      stats: {
        rulesCount: result.rulesCount,
        categoriesCount: result.categoriesCount
      }
    });
  } catch (error) {
    console.error('Error validating backup:', error);
    res.status(400).json({
      success: false,
      valid: false,
      message: 'Invalid backup file',
      error: error.message
    });
  }
}));

app.get('/api/category-rules/backups', errorHandler.asyncHandler(async (req, res) => {
  try {
    const backups = await categoryBackupManager.listBackups();
    
    res.json({
      success: true,
      backups: backups
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing backups',
      error: error.message
    });
  }
}));

app.post('/api/category-rules/backup/create', errorHandler.asyncHandler(async (req, res) => {
  try {
    const result = await categoryBackupManager.createTimestampedBackup();
    
    res.json({
      success: true,
      message: 'Timestamped backup created successfully',
      filePath: result.filePath,
      stats: {
        rulesCount: result.rulesCount,
        categoriesCount: result.categoriesCount
      }
    });
  } catch (error) {
    console.error('Error creating timestamped backup:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating backup',
      error: error.message
    });
  }
}));

// User Settings Management
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getAllUserSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    await db.setUserSetting(key, value);
    res.json({ success: true, message: 'Setting saved successfully' });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving setting',
      error: error.message
    });
  }
});

// Refresh ABS Benchmark Data - Force refresh of government benchmark data
app.post('/api/refresh-benchmarks', errorHandler.asyncHandler(async (req, res) => {
  try {
    console.log('🔄 Manual benchmark refresh requested...');
    
    // Force refresh by calling the benchmark service directly
    const benchmarkService = insightsEngine.benchmarkService;
    
    // Try to fetch fresh data (this will retry if it fails)
    await benchmarkService.fetchABSData();
    
    // Reload the data to get fresh benchmarks
    await benchmarkService.loadBenchmarkData();
    
    // Get metadata for response
    const metadata = benchmarkService.getBenchmarkMetadata();
    
    console.log('✅ Benchmark refresh completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Benchmark data refreshed successfully',
      metadata: {
        source: metadata.source,
        lastUpdated: metadata.last_updated,
        period: metadata.period
      }
    });
    
  } catch (error) {
    console.error('❌ Error refreshing benchmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh benchmark data',
      error: error.message,
      details: 'The system fell back to enhanced fallback data. Check server logs for details.'
    });
  }
}));

// Refresh Categories - Re-categorize all transactions (preserving manual overrides)
app.post('/api/refresh-categories', async (req, res) => {
  try {
    console.log('Starting category refresh...');
    
    // Refresh the calculator's categories first
    await calculator.refreshCategories();
    
    // Get all transactions and existing overrides
    const allTransactions = await db.getAllTransactions();
    const existingOverrides = await db.getCategoryOverrides();
    const overrideMap = {};
    existingOverrides.forEach(override => {
      overrideMap[override.transaction_hash] = true;
    });
    
    let updatedCount = 0;
    const categoryChanges = [];

    console.log(`Found ${allTransactions.length} transactions to re-categorize`);
    console.log(`Found ${existingOverrides.length} manual category overrides to preserve`);

    // Re-categorize each transaction (but skip ones with manual overrides)
    for (const transaction of allTransactions) {
      // Skip transactions that have manual category overrides
      if (overrideMap[transaction.transaction_hash]) {
        console.log(`Skipping transaction ${transaction.id} - has manual category override`);
        continue;
      }
      
      const oldCategory = transaction.category;
      const newCategory = await calculator.categorizeTransaction(transaction.description);
      
      // Only update if category has changed and no manual override exists
      if (newCategory !== oldCategory) {
        // Use direct SQL update instead of override system for refresh
        await db.run('UPDATE transactions SET category = ? WHERE id = ?', [newCategory, transaction.id]);
        updatedCount++;
        categoryChanges.push({
          id: transaction.id,
          description: transaction.description,
          oldCategory,
          newCategory
        });
        console.log(`Updated transaction ${transaction.id}: "${transaction.description}" from ${oldCategory} to ${newCategory}`);
      }
    }

    console.log(`Category refresh complete: ${updatedCount} transactions updated, ${existingOverrides.length} manual overrides preserved`);

    res.json({
      success: true,
      message: `Successfully refreshed categories`,
      updatedCount,
      totalTransactions: allTransactions.length,
      manualOverridesPreserved: existingOverrides.length,
      categoryChanges: categoryChanges.slice(0, 10) // Return first 10 changes for debugging
    });
    
  } catch (error) {
    console.error('Error refreshing categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing categories',
      error: error.message
    });
  }
});

// File Management API endpoints
app.get('/api/files/list', errorHandler.asyncHandler(async (req, res) => {
  const uploadsPath = path.join(__dirname, '../../uploads');
  
  try {
    if (!await fs.pathExists(uploadsPath)) {
      return res.json({ files: {} });
    }

    const filesByCategory = {};
    const categories = ['bank-statements', 'payslips', 'receipts', 'tax-documents', 'other'];
    
    for (const category of categories) {
      const categoryPath = path.join(uploadsPath, category);
      if (await fs.pathExists(categoryPath)) {
        const categoryFiles = await fs.readdir(categoryPath);
        filesByCategory[category] = [];
        
        for (const filename of categoryFiles) {
          if (filename.toLowerCase().endsWith('.pdf')) {
            const filePath = path.join(categoryPath, filename);
            const stats = await fs.stat(filePath);
            
            const month = extractMonthFromFilename(filename) || 
                         stats.mtime.toISOString().substring(0, 7);
            
            filesByCategory[category].push({
              name: filename,
              category,
              month,
              size: stats.size,
              uploadDate: stats.mtime,
              path: filePath
            });
          }
        }
        
        // Sort files by document date (newest first), then by upload date
        filesByCategory[category].sort((a, b) => {
          // First, try to sort by extracted month (document date)
          const aDate = a.month ? new Date(a.month + '-01') : new Date(a.uploadDate);
          const bDate = b.month ? new Date(b.month + '-01') : new Date(b.uploadDate);
          
          // If months are the same, sort by upload date (newest first)
          if (aDate.getTime() === bDate.getTime()) {
            return new Date(b.uploadDate) - new Date(a.uploadDate);
          }
          
          // Sort by document date (newest first)
          return bDate - aDate;
        });
      } else {
        filesByCategory[category] = [];
      }
    }
    
    res.json({ files: filesByCategory });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing files',
      error: error.message
    });
  }
}));

app.post('/api/files/rescan', errorHandler.asyncHandler(async (req, res) => {
  const { filePath, rescanAll } = req.body;
  
  try {
    if (rescanAll) {
      // Rescan all files
      const uploadsPath = path.join(__dirname, '../../uploads');
      console.log('🔄 Rescanning all files...');
      
      const parsedData = await pdfParser.processUploadsFolder(uploadsPath, true);
      let successfulFiles = 0;
      
      // Process each file
      for (const fileData of parsedData) {
        try {
          if (fileData.fileType === 'payslip' && fileData.data?.grossPay) {
            await db.saveIncome(fileData.data, fileData.fileName);
            successfulFiles++;
          } else if ((fileData.fileType === 'amex' || fileData.fileType === 'citi') 
                     && fileData.data?.transactions) {
            const categorizedTransactions = await Promise.all(
              fileData.data.transactions.map(async (t) => ({
                ...t,
                category: await calculator.categorizeTransaction(t.description) || 'OTHER',
                account_type: fileData.fileType
              }))
            );
            
            await db.saveTransactions(categorizedTransactions, fileData.fileName);
            successfulFiles++;
          }
          
          await db.markFileProcessed(fileData.fileName, fileData.fileType);
        } catch (fileError) {
          console.error(`Error processing file ${fileData.fileName}:`, fileError);
        }
      }
      
      res.json({
        success: true,
        message: `Successfully rescanned ${successfulFiles} files`,
        filesProcessed: successfulFiles
      });
    } else if (filePath) {
      // Rescan single file
      console.log(`🔄 Rescanning single file: ${filePath}`);
      
      const filename = path.basename(filePath);
      const fileData = await pdfParser.processSingleFile(filePath, filename);
      
      if (fileData) {
        if (fileData.fileType === 'payslip' && fileData.data?.grossPay) {
          await db.saveIncome(fileData.data, fileData.fileName);
        } else if ((fileData.fileType === 'amex' || fileData.fileType === 'citi') 
                   && fileData.data?.transactions) {
          const categorizedTransactions = await Promise.all(
            fileData.data.transactions.map(async (t) => ({
              ...t,
              category: await calculator.categorizeTransaction(t.description) || 'OTHER',
              account_type: fileData.fileType
            }))
          );
          
          await db.saveTransactions(categorizedTransactions, fileData.fileName);
        }
        
        await db.markFileProcessed(fileData.fileName, fileData.fileType);
        
        res.json({
          success: true,
          message: `Successfully rescanned ${filename}`,
          filesProcessed: 1
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to parse file'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Either filePath or rescanAll must be provided'
      });
    }
  } catch (error) {
    console.error('Error rescanning files:', error);
    res.status(500).json({
      success: false,
      message: 'Error rescanning files',
      error: error.message
    });
  }
}));

app.delete('/api/files/delete', errorHandler.asyncHandler(async (req, res) => {
  const { filePath, deleteAll, category } = req.body;
  
  try {
    if (deleteAll) {
      // Delete all files in a category or all files
      const uploadsPath = path.join(__dirname, '../../uploads');
      let deletedCount = 0;
      
      if (category) {
        // Delete all files in specific category
        const categoryPath = path.join(uploadsPath, category);
        if (await fs.pathExists(categoryPath)) {
          const files = await fs.readdir(categoryPath);
          for (const filename of files) {
            if (filename.toLowerCase().endsWith('.pdf')) {
              const filePath = path.join(categoryPath, filename);
              await fs.remove(filePath);
              
              // Remove from database tracking
              await db.removeFileProcessed(filename);
              deletedCount++;
            }
          }
        }
        
        res.json({
          success: true,
          message: `Successfully deleted ${deletedCount} files from ${category} category`,
          filesDeleted: deletedCount
        });
      } else {
        // Delete all files from all categories
        const categories = ['bank-statements', 'payslips', 'receipts', 'tax-documents', 'other'];
        
        for (const cat of categories) {
          const categoryPath = path.join(uploadsPath, cat);
          if (await fs.pathExists(categoryPath)) {
            const files = await fs.readdir(categoryPath);
            for (const filename of files) {
              if (filename.toLowerCase().endsWith('.pdf')) {
                const filePath = path.join(categoryPath, filename);
                await fs.remove(filePath);
                
                // Remove from database tracking
                await db.removeFileProcessed(filename);
                deletedCount++;
              }
            }
          }
        }
        
        res.json({
          success: true,
          message: `Successfully deleted ${deletedCount} files from all categories`,
          filesDeleted: deletedCount
        });
      }
    } else if (filePath) {
      // Delete single file
      if (await fs.pathExists(filePath)) {
        const filename = path.basename(filePath);
        await fs.remove(filePath);
        
        // Remove from database tracking
        await db.removeFileProcessed(filename);
        
        res.json({
          success: true,
          message: `Successfully deleted ${filename}`,
          filesDeleted: 1
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Either filePath or deleteAll must be provided'
      });
    }
  } catch (error) {
    console.error('Error deleting files:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting files',
      error: error.message
    });
  }
}));

// Category trend analysis endpoints
app.post('/api/category-trends', async (req, res) => {
  try {
    const { categories, startDate, endDate } = req.body;
    
    if (!categories || categories.length === 0) {
      return res.json({ trends: [] });
    }
    
    const trends = [];
    
    for (const category of categories) {
      // Get monthly data for this category with timezone-aware date filtering
      const monthlyData = await db.getCategoryMonthlyTrends(category, startDate, endDate);
      trends.push({
        category: category,
        monthlyData: monthlyData
      });
    }
    
    res.json({ trends });
  } catch (error) {
    console.error('Error fetching category trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category trends',
      error: error.message
    });
  }
});

app.post('/api/transactions-by-categories', async (req, res) => {
  try {
    const { categories, startDate, endDate } = req.body;
    
    if (!categories || categories.length === 0) {
      return res.json({ transactions: [] });
    }
    
    const transactions = await db.getTransactionsByCategories(categories, startDate, endDate);
    
    res.json({ 
      transactions: transactions,
      count: transactions.length 
    });
  } catch (error) {
    console.error('Error fetching transactions by categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions by categories',
      error: error.message
    });
  }
});

// Balance Adjustments Management
app.get('/api/balance-adjustments', async (req, res) => {
  try {
    const adjustments = await db.getBalanceAdjustments();
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching balance adjustments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching balance adjustments',
      error: error.message
    });
  }
});

app.post('/api/balance-adjustments', async (req, res) => {
  try {
    const { adjustmentDate, adjustmentType, amount, description } = req.body;
    await db.addBalanceAdjustment(adjustmentDate, adjustmentType, amount, description);
    res.json({ success: true, message: 'Balance adjustment added successfully' });
  } catch (error) {
    console.error('Error adding balance adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding balance adjustment',
      error: error.message
    });
  }
});

app.delete('/api/balance-adjustments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteBalanceAdjustment(id);
    res.json({ success: true, message: 'Balance adjustment deleted successfully' });
  } catch (error) {
    console.error('Error deleting balance adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting balance adjustment',
      error: error.message
    });
  }
});

// 404 handler for API routes
app.use('/api/*', errorHandler.notFoundHandler);

// Serve the frontend (React app) for all non-API routes in production only
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Global error handling middleware (must be last)
app.use(errorHandler.handle);

// Initialize database, custom categories, and start server
db.init().then(async () => {
  // Initialize custom category manager, father category manager, calculator, and user data manager
  await customCategoryManager.init();
  await fatherCategoryManager.init();
  await calculator.init();
  await userDataManager.init();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Dashboard: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});