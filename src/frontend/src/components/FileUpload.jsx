import React, { useState, useEffect, useRef } from 'react';
import { formatDate } from '../utils/sharedFormatters';
import './FileUpload.css';

const FileUpload = ({ isOpen, onClose, onUploadComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const fileInputRef = useRef(null);

  // File organization guidelines
  const fileGuidelines = {
    'bank-statements': {
      title: 'Bank Statements',
      description: 'Monthly statements from AMEX, Citi, or other banks',
      examples: ['AMEX_Statement_202401.pdf', 'Citi_Statement_Jan2024.pdf'],
      keywords: ['statement', 'amex', 'citi', 'bank'],
      icon: '🏦'
    },
    'payslips': {
      title: 'Payslips',
      description: 'Monthly payslips from Deloitte or other employers',
      examples: ['Deloitte_Payslip_202401.pdf', 'Salary_Jan2024.pdf'],
      keywords: ['payslip', 'salary', 'deloitte', 'pay'],
      icon: '💰'
    },
    'receipts': {
      title: 'Receipts',
      description: 'Major purchase receipts for tracking expenses',
      examples: ['Receipt_Electronics_Jan2024.pdf', 'Grocery_Receipt_20240115.pdf'],
      keywords: ['receipt', 'purchase', 'invoice'],
      icon: '🧾'
    },
    'tax-documents': {
      title: 'Tax Documents',
      description: 'Annual tax returns and related documents',
      examples: ['Tax_Return_2023.pdf', 'PAYG_Summary_2023.pdf'],
      keywords: ['tax', 'return', 'payg', 'ato'],
      icon: '📋'
    },
    'other': {
      title: 'Other Documents',
      description: 'Insurance, property, and miscellaneous financial documents',
      examples: ['Insurance_Policy.pdf', 'Property_Statement.pdf'],
      keywords: ['insurance', 'property', 'misc'],
      icon: '📄'
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExistingFiles();
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  const loadExistingFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/files/existing');
      if (response.ok) {
        const data = await response.json();
        setExistingFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error loading existing files:', error);
      setExistingFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const categorizeFile = (filename) => {
    const lowerName = filename.toLowerCase();
    
    for (const [category, guide] of Object.entries(fileGuidelines)) {
      if (guide.keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  };

  const extractDateFromFilename = (filename) => {
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
            console.log(`📅 Extracted date from "${filename}": ${year}-${month.toString().padStart(2, '0')}`);
            return `${year}-${month.toString().padStart(2, '0')}`;
          }
        } catch (e) {
          console.warn(`⚠️ Error parsing date from "${filename}":`, e);
          continue;
        }
      }
    }
    
    console.warn(`⚠️ Could not extract date from filename: "${filename}"`);
    return null;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      alert('Only PDF files are supported. Non-PDF files have been filtered out.');
    }

    const processedFiles = pdfFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      category: categorizeFile(file.name),
      estimatedMonth: extractDateFromFilename(file.name),
      id: Math.random().toString(36).substr(2, 9)
    }));

    setSelectedFiles(prev => [...prev, ...processedFiles]);
  };

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileCategory = (fileId, newCategory) => {
    setSelectedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, category: newCategory } : f)
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      selectedFiles.forEach((fileData, index) => {
        formData.append('files', fileData.file);
        formData.append(`categories`, fileData.category);
        formData.append(`estimatedMonths`, fileData.estimatedMonth || '');
      });

      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully uploaded ${result.filesUploaded} files!`);
        setSelectedFiles([]);
        onUploadComplete();
        onClose();
      } else {
        alert(`Upload failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getMonthlyFileData = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthlyData = months.map((monthName, index) => {
      const monthKey = `${currentYear}-${(index + 1).toString().padStart(2, '0')}`;
      const filesInMonth = existingFiles.filter(file => file.month === monthKey);
      
      // Get category distribution
      const categories = {};
      filesInMonth.forEach(file => {
        categories[file.category] = (categories[file.category] || 0) + 1;
      });
      
      return {
        monthName,
        monthIndex: index,
        monthKey,
        files: filesInMonth,
        categories,
        hasFiles: filesInMonth.length > 0
      };
    });
    
    return monthlyData;
  };

  const navigateYear = (direction) => {
    setCurrentYear(prev => prev + direction);
  };

  const getCategoryIcons = (categories) => {
    // Return icons for all categories present, sorted by file count (most files first)
    if (Object.keys(categories).length === 0) return [];
    
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a) // Sort by file count descending
      .map(([category, count]) => ({
        category,
        count,
        icon: fileGuidelines[category]?.icon || '📄',
        title: fileGuidelines[category]?.title || category
      }));
  };

  const handleIconHover = (event, monthData, iconData) => {
    const rect = event.target.getBoundingClientRect();
    const filesForCategory = monthData.files.filter(file => file.category === iconData.category);
    
    setTooltipData({
      x: rect.left + rect.width / 2,
      y: rect.top - 10, // Position above the icon
      title: iconData.title,
      files: filesForCategory
    });
    setHoveredMonth(`${monthData.monthKey}-${iconData.category}`);
  };

  const handleIconLeave = () => {
    setTooltipData(null);
    setHoveredMonth(null);
  };

  if (!isOpen) return null;

  // Handle background click
  const handleBackgroundClick = (event) => {
    if (event.target.classList.contains('file-upload-overlay')) {
      onClose();
    }
  };

  return (
    <div className="file-upload-overlay" onClick={handleBackgroundClick}>
      <div className="file-upload-modal">
        <div className="file-upload-header">
          <h2>📁 Upload Financial Documents</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="file-upload-content">
          {/* Existing Files Display - Monthly Grid */}
          <div className="existing-files-section">
            <div className="section-header">
              <h3>📂 Existing Files by Month</h3>
              <div className="year-navigation">
                <button 
                  className="year-nav-btn" 
                  onClick={() => navigateYear(-1)}
                  title="Previous Year"
                >
                  ‹
                </button>
                <span className="current-year">{currentYear}</span>
                <button 
                  className="year-nav-btn" 
                  onClick={() => navigateYear(1)}
                  title="Next Year"
                >
                  ›
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="loading">Loading existing files...</div>
            ) : (
              <div className="monthly-grid">
                {getMonthlyFileData().map((monthData) => {
                  const categoryIcons = getCategoryIcons(monthData.categories);
                  
                  return (
                    <div 
                      key={monthData.monthKey} 
                      className={`month-block ${monthData.hasFiles ? 'has-files' : 'empty'}`}
                    >
                      <div className="month-name">{monthData.monthName}</div>
                      <div className="month-icons">
                        {monthData.hasFiles ? (
                          categoryIcons.map((iconData, index) => (
                            <div 
                              key={iconData.category}
                              className="category-icon"
                              onMouseEnter={(e) => handleIconHover(e, monthData, iconData)}
                              onMouseLeave={handleIconLeave}
                            >
                              <span className="icon">{iconData.icon}</span>
                              {iconData.count > 1 && <span className="count-badge">{iconData.count}</span>}
                            </div>
                          ))
                        ) : (
                          <div className="empty-icon">📅</div>
                        )}
                      </div>
                      <div className="file-count">
                        {monthData.files.length > 0 ? `${monthData.files.length} files` : 'No files'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* File Upload Area */}
          <div className="upload-section">
            <h3>⬆️ Upload New Files</h3>
            
            <div 
              className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-content">
                <div className="upload-icon">📤</div>
                <p><strong>Drag & Drop PDF files here</strong></p>
                <p>or <span className="browse-link">browse files</span></p>
                <p className="file-info">Supports: PDF files only | Max size: 50MB per file</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <h4>Selected Files ({selectedFiles.length})</h4>
                <div className="files-list">
                  {selectedFiles.map((fileData) => (
                    <div key={fileData.id} className="selected-file">
                      <div className="file-info">
                        <span className="file-icon">{fileGuidelines[fileData.category]?.icon || '📄'}</span>
                        <div className="file-details">
                          <div className="file-name">{fileData.name}</div>
                          <div className="file-meta">
                            {(fileData.size / 1024 / 1024).toFixed(2)} MB
                            {fileData.estimatedMonth && (
                              <span className="estimated-month">• Est. {fileData.estimatedMonth}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="file-controls">
                        <select 
                          value={fileData.category} 
                          onChange={(e) => updateFileCategory(fileData.id, e.target.value)}
                          className="category-select"
                        >
                          {Object.entries(fileGuidelines).map(([key, guide]) => (
                            <option key={key} value={key}>{guide.title}</option>
                          ))}
                        </select>
                        <button 
                          className="remove-file-btn"
                          onClick={() => removeFile(fileData.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p>Uploading... {uploadProgress}%</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="upload-actions">
              <button 
                className="cancel-btn" 
                onClick={onClose}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="upload-btn" 
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
              </button>
            </div>
          </div>

          {/* File Organization Guidelines */}
          <div className="upload-guidelines">
            <h3>📋 File Organization Guide</h3>
            <div className="guidelines-grid">
              {Object.entries(fileGuidelines).map(([key, guide]) => (
                <div key={key} className="guideline-card">
                  <div className="guideline-icon">{guide.icon}</div>
                  <div className="guideline-content">
                    <h4>{guide.title}</h4>
                    <p>{guide.description}</p>
                    <div className="examples">
                      <strong>Examples:</strong>
                      <ul>
                        {guide.examples.map((example, i) => (
                          <li key={i}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global Tooltip */}
        {tooltipData && (
          <div 
            className="global-icon-tooltip"
            style={{
              position: 'fixed',
              left: tooltipData.x,
              top: tooltipData.y,
              transform: 'translate(-50%, -100%)', // Center horizontally and position above
              zIndex: 99999
            }}
          >
            <div className="tooltip-content">
              <div className="tooltip-header">{tooltipData.title}</div>
              <div className="tooltip-files">
                {tooltipData.files.map((file, index) => (
                  <div key={index} className="tooltip-filename">
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;