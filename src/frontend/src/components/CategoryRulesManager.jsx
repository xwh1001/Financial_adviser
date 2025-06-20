import React, { useState, useEffect } from 'react';
import { categoryEmojis } from '../utils/categoryEmojis';

const CategoryRulesManager = ({ isOpen, onClose }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({ pattern: '', category: '', priority: 0 });
  const [customCategories, setCustomCategories] = useState({});

  const availableCategories = [...new Set([...Object.keys(categoryEmojis), ...Object.keys(customCategories)])];

  useEffect(() => {
    if (isOpen) {
      loadCategoryRules();
      loadCustomCategories();
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (editingRule) {
          setEditingRule(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen || editingRule) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, editingRule, onClose]);

  // Handle outside click
  const handleOutsideClick = (event) => {
    if (event.target.classList.contains('modal')) {
      onClose();
    }
  };

  const loadCustomCategories = async () => {
    try {
      const response = await fetch('/api/custom-categories');
      if (response.ok) {
        const data = await response.json();
        setCustomCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
  };

  const loadCategoryRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/category-rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Error loading category rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async (rule) => {
    try {
      const url = rule.id ? `/api/category-rules/${rule.id}` : '/api/category-rules';
      const method = rule.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });

      if (response.ok) {
        await loadCategoryRules();
        setEditingRule(null);
        setNewRule({ pattern: '', category: '', priority: 0 });
      }
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const deleteRule = async (id) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        const response = await fetch(`/api/category-rules/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadCategoryRules();
        }
      } catch (error) {
        console.error('Error deleting rule:', error);
      }
    }
  };

  const toggleRuleEnabled = async (rule) => {
    const updatedRule = { ...rule, enabled: !rule.enabled };
    await saveRule(updatedRule);
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }} onClick={handleOutsideClick}>
      <div className="modal-content" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h3>🏷️ Category Rules Management</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner"></div>
              <p>Loading category rules...</p>
            </div>
          ) : (
            <>
              {/* Add New Rule Section */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h4>➕ Add New Categorization Rule</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 120px', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label>Pattern (text to match in transaction description):</label>
                    <input
                      type="text"
                      value={newRule.pattern}
                      onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                      placeholder="e.g., WOOLWORTHS, UBER, NETFLIX"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div>
                    <label>Category:</label>
                    <select
                      value={newRule.category}
                      onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="">Select Category</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {categoryEmojis[cat] || '📂'} {cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Priority:</label>
                    <input
                      type="number"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <button
                    onClick={() => saveRule(newRule)}
                    disabled={!newRule.pattern || !newRule.category}
                    className="nav-btn"
                    style={{ 
                      background: newRule.pattern && newRule.category ? '#27ae60' : '#bdc3c7',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px'
                    }}
                  >
                    Add Rule
                  </button>
                </div>
              </div>

              {/* Existing Rules */}
              <div className="card">
                <h4>📋 Current Categorization Rules</h4>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  Rules are applied in order of priority (higher numbers first). 
                  The first matching rule determines the transaction category.
                </p>
                
                {rules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    <p>No custom rules defined yet. Using default categorization logic.</p>
                    <p style={{ fontSize: '0.9rem' }}>Add rules above to customize how transactions are categorized.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Priority</th>
                          <th>Pattern</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map(rule => (
                          <tr key={rule.id} style={{ opacity: rule.enabled ? 1 : 0.5 }}>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ 
                                background: rule.priority > 5 ? '#e74c3c' : rule.priority > 0 ? '#f39c12' : '#95a5a6',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.8rem'
                              }}>
                                {rule.priority}
                              </span>
                            </td>
                            <td>
                              <code style={{ background: '#f8f9fa', padding: '2px 6px', borderRadius: '4px' }}>
                                {rule.pattern}
                              </code>
                            </td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>{categoryEmojis[rule.category] || '📂'}</span>
                                {rule.category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => toggleRuleEnabled(rule)}
                                style={{
                                  background: rule.enabled ? '#27ae60' : '#e74c3c',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {rule.enabled ? '✓ Enabled' : '✗ Disabled'}
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => setEditingRule(rule)}
                                  style={{
                                    background: '#3498db',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => deleteRule(rule.id)}
                                  style={{
                                    background: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Default Rules Information */}
              <div className="card" style={{ marginTop: '2rem', background: '#f8f9fa' }}>
                <h4>ℹ️ Default Categorization Logic</h4>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  When no custom rules match, transactions are categorized using these built-in patterns:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <strong>🛒 Groceries:</strong> WOOLWORTHS, COLES, IGA, ALDI
                  </div>
                  <div>
                    <strong>🍽️ Dining:</strong> MCDONALD'S, KFC, UBER EATS, DOMINO'S
                  </div>
                  <div>
                    <strong>⛽ Transport:</strong> SHELL, BP, UBER, TAXI
                  </div>
                  <div>
                    <strong>📱 Shopping:</strong> AMAZON, EBAY, JB HI-FI, BUNNINGS
                  </div>
                  <div>
                    <strong>⚡ Utilities:</strong> ORIGIN ENERGY, AGL, TELSTRA
                  </div>
                  <div>
                    <strong>📺 Entertainment:</strong> NETFLIX, SPOTIFY, CINEMA
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="modal" style={{ display: 'block', zIndex: 1100 }} onClick={(e) => { if (e.target.classList.contains('modal')) setEditingRule(null); }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>✏️ Edit Rule</h3>
              <button className="modal-close" onClick={() => setEditingRule(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label>Pattern:</label>
                  <input
                    type="text"
                    value={editingRule.pattern}
                    onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label>Category:</label>
                  <select
                    value={editingRule.category}
                    onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {categoryEmojis[cat] || '📂'} {cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Priority:</label>
                  <input
                    type="number"
                    value={editingRule.priority}
                    onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setEditingRule(null)}
                    className="nav-btn"
                    style={{ background: '#95a5a6', color: 'white' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveRule(editingRule)}
                    className="nav-btn"
                    style={{ background: '#27ae60', color: 'white' }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryRulesManager;