import React, { useState, useEffect } from 'react';
import ProgressDialog from './ProgressDialog';

const FileManagement = () => {
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [progressDialog, setProgressDialog] = useState({ isOpen: false, title: '', message: '' });

  const categories = [
    { id: 'bank-statements', label: '🏦 Bank Statements', icon: '🏦' },
    { id: 'payslips', label: '💰 Payslips', icon: '💰' },
    { id: 'receipts', label: '🧾 Receipts', icon: '🧾' },
    { id: 'tax-documents', label: '📋 Tax Documents', icon: '📋' },
    { id: 'other', label: '📄 Other', icon: '📄' }
  ];

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/files/list');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || {});
      } else {
        console.error('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRescanFile = async (filePath, filename) => {
    if (!confirm(`Rescan file "${filename}"?\n\nThis will re-parse the file and update any extracted data.`)) {
      return;
    }

    setProgressDialog({
      isOpen: true,
      title: 'Rescanning File',
      message: `Re-processing ${filename}...`
    });

    try {
      const response = await fetch('/api/files/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        await loadFiles(); // Refresh file list
      } else {
        const error = await response.json();
        alert(`❌ Rescan failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error rescanning file:', error);
      alert('❌ Error rescanning file. Please try again.');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };

  const handleRescanAll = async () => {
    if (!confirm('⚠️ Rescan All Files?\n\nThis will re-parse ALL uploaded files and may take several minutes.\n\nContinue?')) {
      return;
    }

    setProgressDialog({
      isOpen: true,
      title: 'Rescanning All Files',
      message: 'Re-processing all uploaded files. This may take several minutes...'
    });

    try {
      const response = await fetch('/api/files/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rescanAll: true })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        await loadFiles(); // Refresh file list
      } else {
        const error = await response.json();
        alert(`❌ Rescan failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error rescanning all files:', error);
      alert('❌ Error rescanning files. Please try again.');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };

  const handleDeleteFile = async (filePath, filename) => {
    if (!confirm(`⚠️ Delete File?\n\n"${filename}"\n\nThis action cannot be undone. The file will be permanently deleted.`)) {
      return;
    }

    try {
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        await loadFiles(); // Refresh file list
      } else {
        const error = await response.json();
        alert(`❌ Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('❌ Error deleting file. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    const fileCount = files[categoryId]?.length || 0;
    
    if (fileCount === 0) {
      alert('No files to delete in this category.');
      return;
    }

    if (!confirm(`⚠️ Delete All Files in ${category.label}?\n\n${fileCount} files will be permanently deleted.\n\nThis action cannot be undone.`)) {
      return;
    }

    setProgressDialog({
      isOpen: true,
      title: 'Deleting Files',
      message: `Deleting ${fileCount} files from ${category.label}...`
    });

    try {
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true, category: categoryId })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        await loadFiles(); // Refresh file list
      } else {
        const error = await response.json();
        alert(`❌ Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting category files:', error);
      alert('❌ Error deleting files. Please try again.');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };

  const handleDeleteAll = async () => {
    const totalFiles = Object.values(files).reduce((sum, categoryFiles) => sum + categoryFiles.length, 0);
    
    if (totalFiles === 0) {
      alert('No files to delete.');
      return;
    }

    if (!confirm(`⚠️ Delete ALL Files?\n\n${totalFiles} files will be permanently deleted from all categories.\n\nThis action cannot be undone.`)) {
      return;
    }

    setProgressDialog({
      isOpen: true,
      title: 'Deleting All Files',
      message: `Deleting ${totalFiles} files from all categories...`
    });

    try {
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        await loadFiles(); // Refresh file list
      } else {
        const error = await response.json();
        alert(`❌ Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting all files:', error);
      alert('❌ Error deleting files. Please try again.');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };

  const getTotalFiles = () => {
    return Object.values(files).reduce((sum, categoryFiles) => sum + categoryFiles.length, 0);
  };

  const getTotalSize = () => {
    let totalSize = 0;
    Object.values(files).forEach(categoryFiles => {
      categoryFiles.forEach(file => {
        totalSize += file.size || 0;
      });
    });
    return totalSize;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="loading-spinner"></div>
        <p>Loading files...</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <h4>📁 File Management</h4>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Review, rescan, and manage your uploaded financial documents.
        </p>

        {/* Summary and Actions */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h5>📊 File Summary</h5>
              <p style={{ color: '#666', margin: 0 }}>
                Total: {getTotalFiles()} files ({formatFileSize(getTotalSize())})
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleRescanAll}
                className="nav-btn"
                style={{ background: '#17a2b8', color: 'white', padding: '10px 20px' }}
                disabled={getTotalFiles() === 0}
              >
                🔄 Rescan All Files
              </button>
              <button
                onClick={handleDeleteAll}
                className="nav-btn"
                style={{ 
                  background: '#dc3545', 
                  color: 'white', 
                  padding: '10px 20px',
                  border: '2px solid #c82333'
                }}
                disabled={getTotalFiles() === 0}
              >
                🗑️ Delete All Files
              </button>
            </div>
          </div>
        </div>

        {/* File Categories */}
        <div className="card">
          <h5>📂 Files by Category</h5>
          <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Files are sorted by document date (newest first), then by upload date
          </p>
          
          {categories.map(category => {
            const categoryFiles = files[category.id] || [];
            const isExpanded = expandedCategories[category.id];
            
            return (
              <div key={category.id} style={{ marginBottom: '1rem', border: '1px solid #e9ecef', borderRadius: '8px' }}>
                {/* Category Header */}
                <div 
                  style={{ 
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px 8px 0 0',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                    <div>
                      <h6 style={{ margin: 0 }}>{category.label}</h6>
                      <small style={{ color: '#666' }}>
                        {categoryFiles.length} files
                        {categoryFiles.length > 0 && (
                          ` (${formatFileSize(categoryFiles.reduce((sum, f) => sum + (f.size || 0), 0))})`
                        )}
                      </small>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {categoryFiles.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        🗑️ Delete All
                      </button>
                    )}
                    <span style={{ fontSize: '1.2rem', color: '#666' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Category Files (when expanded) */}
                {isExpanded && (
                  <div style={{ padding: '1rem' }}>
                    {categoryFiles.length === 0 ? (
                      <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                        📭 No files in this category
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {categoryFiles.map((file, index) => (
                          <div key={index} style={{ 
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            padding: '1rem',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            minHeight: '60px'
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ minWidth: '200px' }}>
                                  <div style={{ fontWeight: '500', fontSize: '0.95rem', wordBreak: 'break-word' }}>
                                    📄 {file.name}
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  <span>📅 {file.month}</span>
                                  <span>📊 {formatFileSize(file.size)}</span>
                                  <span>⏰ {formatDate(file.uploadDate)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                              <button
                                onClick={() => handleRescanFile(file.path, file.name)}
                                style={{
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🔄 Rescan
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.path, file.name)}
                                style={{
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Information */}
        <div className="card" style={{ marginTop: '2rem', background: '#e3f2fd' }}>
          <h5>ℹ️ File Management Help</h5>
          <ul style={{ color: '#666', fontSize: '0.9rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>Rescan:</strong> Re-parse a file to extract updated transaction or income data</li>
            <li><strong>Delete:</strong> Permanently remove files from the system and file tracking</li>
            <li><strong>Categories:</strong> Click category headers to expand/collapse file lists</li>
            <li><strong>File Info:</strong> Shows filename, month extracted, file size, and upload date</li>
            <li><strong>Bulk Actions:</strong> Rescan or delete all files at once for maintenance</li>
          </ul>
        </div>
      </div>

      {/* Progress Dialog */}
      <ProgressDialog 
        isOpen={progressDialog.isOpen}
        title={progressDialog.title}
        message={progressDialog.message}
      />
    </>
  );
};

export default FileManagement;