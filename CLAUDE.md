# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack financial dashboard application that processes PDF financial documents (bank statements, payslips, receipts) and provides interactive analytics. The system consists of:

- **Backend**: Node.js/Express API server with SQLite database
- **Frontend**: React application with interactive financial dashboards
- **Document Processing**: PDF parsing system that extracts transactions from various Australian bank formats (AMEX, Citi) and payslips (Deloitte format)
- **File Organization**: Structured upload system with categorized folders for different document types

## Architecture

### Core Components
- `src/backend/server.js`: Main Express server with API endpoints, file upload handling, and middleware
- `src/backend/database.js`: SQLite database management with tables for transactions, income, categories, and settings
- `src/backend/utils/pdfParser.js`: PDF processing engine with regex patterns for AMEX, Citi statements and Deloitte payslips
- `src/backend/utils/financialCalculator.js`: Transaction categorization system with comprehensive Australian spending categories
- `src/frontend/src/App.js`: React application root with section routing and data management

### Database Schema
- `transactions`: Financial transactions with automatic categorization
- `income`: Payslip data extraction with gross/net pay, tax, superannuation
- `categories`: User-defined spending category rules
- `settings`: User preferences and goals

### Document Processing Flow
1. Files uploaded to categorized folders (`bank-statements/`, `payslips/`, `receipts/`, etc.)
2. PDF parser extracts structured data using bank-specific regex patterns
3. Transactions automatically categorized using keyword matching
4. Data stored in SQLite with duplicate detection via transaction hashing

## Development Commands

### Backend Development
```bash
npm start              # Production server
npm run dev            # Development server with nodemon
```

### Frontend Development
```bash
npm run dev:frontend   # Start React development server
npm run build:frontend # Build React for production
```

### Full Development
```bash
npm run dev:full       # Run both backend and frontend concurrently
```

## File Structure

### Upload Categories
Documents are organized in `uploads/` with specific folders:
- `bank-statements/`: Monthly statements (AMEX, Citi formats supported)
- `payslips/`: Deloitte payslips with automatic pay period extraction
- `receipts/`: Major purchase receipts
- `tax-documents/`: Annual tax returns and related documents
- `other/`: Insurance, property, and miscellaneous financial documents

### Frontend Components
- `Overview`: Dashboard summary with key metrics
- `Monthly`: Monthly spending analysis with charts
- `Categories`: Transaction categorization management
- `HouseGoal`: Savings goal tracking
- `Settings`: User preferences and category rules

## Key Features

### PDF Processing
- Supports AMEX statement format with date/description/amount extraction
- Citi statement parsing with Australian merchant detection
- Deloitte payslip processing with tax/super calculation
- Automatic duplicate transaction detection

### Categorization System
- Comprehensive Australian spending categories (groceries, transport, utilities)
- User-customizable category rules
- Automatic merchant classification
- Category-based spending analytics

### Data Flow
- API endpoints: `/api/dashboard`, `/api/process-files`, `/api/transactions`
- Real-time data updates after document processing
- Settings persistence for user preferences