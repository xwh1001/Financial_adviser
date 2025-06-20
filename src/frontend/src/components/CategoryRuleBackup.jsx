import React, { useState, useEffect } from 'react';

const CategoryRuleBackup = () => {
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/category-rules/backups');
      const data = await response.json();
      
      if (data.success) {
        setBackups(data.backups);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/category-rules/export');
      const data = await response.json();
      
      if (data.success) {
        showMessage(
          `Exported ${data.stats.rulesCount} rules and ${data.stats.categoriesCount} categories successfully!`,
          'success'
        );
        await loadBackups(); // Refresh backup list
      } else {
        showMessage(data.message || 'Export failed', 'error');
      }
    } catch (error) {
      showMessage('Error exporting rules: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (replaceExisting = false) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/category-rules/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replaceExisting }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const stats = data.stats;
        showMessage(
          `Import completed! Rules imported: ${stats.rulesImported}, updated: ${stats.rulesUpdated}, skipped: ${stats.rulesSkipped}`,
          'success'
        );
      } else {
        showMessage(data.message || 'Import failed', 'error');
      }
    } catch (error) {
      showMessage('Error importing rules: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/category-rules/backup/create', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage(
          `Timestamped backup created with ${data.stats.rulesCount} rules!`,
          'success'
        );
        await loadBackups(); // Refresh backup list
      } else {
        showMessage(data.message || 'Backup creation failed', 'error');
      }
    } catch (error) {
      showMessage('Error creating backup: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateBackup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/category-rules/validate-backup', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success && data.valid) {
        showMessage(
          `Backup is valid! Contains ${data.stats.rulesCount} rules and ${data.stats.categoriesCount} categories.`,
          'success'
        );
      } else {
        showMessage(data.message || 'Backup validation failed', 'error');
      }
    } catch (error) {
      showMessage('Error validating backup: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-AU');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="category-backup-section">
      <h3>🔄 Category Rules Backup & Restore</h3>
      <p className="section-description">
        Backup your custom category rules and settings so you can restore them after database resets.
      </p>

      {message && (
        <div className={`message ${messageType}`}>
          {messageType === 'success' ? '✅' : '❌'} {message}
        </div>
      )}

      <div className="backup-actions">
        <div className="action-group">
          <h4>📤 Export & Backup</h4>
          <button 
            onClick={handleExport} 
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Exporting...' : 'Export Current Rules'}
          </button>
          <button 
            onClick={handleCreateBackup} 
            disabled={isLoading}
            className="btn btn-secondary"
          >
            {isLoading ? 'Creating...' : 'Create Timestamped Backup'}
          </button>
        </div>

        <div className="action-group">
          <h4>📥 Import & Restore</h4>
          <button 
            onClick={handleValidateBackup} 
            disabled={isLoading}
            className="btn btn-info"
          >
            {isLoading ? 'Validating...' : 'Validate Backup'}
          </button>
          <button 
            onClick={() => handleImport(false)} 
            disabled={isLoading}
            className="btn btn-warning"
          >
            {isLoading ? 'Importing...' : 'Import (Merge)'}
          </button>
          <button 
            onClick={() => handleImport(true)} 
            disabled={isLoading}
            className="btn btn-danger"
          >
            {isLoading ? 'Importing...' : 'Import (Replace All)'}
          </button>
        </div>
      </div>

      <div className="backup-list">
        <h4>📁 Available Backups</h4>
        {backups.length === 0 ? (
          <p className="no-backups">No backups found. Create your first backup above!</p>
        ) : (
          <div className="backup-grid">
            {backups.map((backup, index) => (
              <div key={index} className="backup-item">
                <div className="backup-info">
                  <div className="backup-name">{backup.filename}</div>
                  <div className="backup-meta">
                    <span>📊 {backup.rulesCount} rules, {backup.categoriesCount} categories</span>
                    <span>📅 {formatDate(backup.created)}</span>
                    <span>📦 {formatFileSize(backup.size)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="backup-info-section">
        <h4>ℹ️ How It Works</h4>
        <ul>
          <li><strong>Export Current Rules</strong>: Creates/updates the default backup file with your current rules</li>
          <li><strong>Create Timestamped Backup</strong>: Creates a new backup file with timestamp</li>
          <li><strong>Validate Backup</strong>: Checks if your backup file is valid and shows what it contains</li>
          <li><strong>Import (Merge)</strong>: Adds backup rules to existing ones (skips duplicates)</li>
          <li><strong>Import (Replace All)</strong>: Removes all current rules and replaces with backup</li>
        </ul>
        
        <div className="backup-location">
          <strong>📂 Backup Location:</strong> <code>user-data/category-rules-backup.json</code>
        </div>
      </div>

      <style jsx>{`
        .category-backup-section {
          margin: 2rem 0;
          padding: 1.5rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .section-description {
          color: #666;
          margin-bottom: 1.5rem;
        }

        .message {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .backup-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .action-group h4 {
          margin-bottom: 1rem;
          color: #333;
        }

        .btn {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-info {
          background: #17a2b8;
          color: white;
        }

        .btn-info:hover:not(:disabled) {
          background: #117a8b;
        }

        .btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .backup-list h4 {
          margin-bottom: 1rem;
        }

        .no-backups {
          color: #666;
          font-style: italic;
        }

        .backup-grid {
          display: grid;
          gap: 1rem;
        }

        .backup-item {
          padding: 1rem;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .backup-name {
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .backup-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: #666;
        }

        .backup-info-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #ddd;
        }

        .backup-info-section ul {
          margin: 1rem 0;
        }

        .backup-info-section li {
          margin-bottom: 0.5rem;
        }

        .backup-location {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #f0f0f0;
          border-radius: 4px;
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .backup-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CategoryRuleBackup;