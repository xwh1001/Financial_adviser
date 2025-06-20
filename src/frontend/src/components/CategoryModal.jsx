import React, { useState, useEffect } from 'react';
import { categoryEmojis } from '../utils/categoryEmojis';

const CategoryModal = ({ isOpen, category, categoryName, selectedMonths = [], onClose }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedTransactionForRule, setSelectedTransactionForRule] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  useEffect(() => {
    if (isOpen && category) {
      fetchCategoryTransactions();
      fetchAvailableCategories();
    }
  }, [isOpen, category, selectedMonths]);

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

  // Handle outside click
  const handleOutsideClick = (event) => {
    if (event.target.classList.contains('modal')) {
      onClose();
    }
  };

  const fetchCategoryTransactions = async () => {
    setLoading(true);
    try {
      // If we have selected months, use the filtered endpoint
      if (selectedMonths && selectedMonths.length > 0) {
        const response = await fetch('/api/transactions/category-filtered', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            category: category, 
            months: selectedMonths 
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
        } else {
          setTransactions([]);
        }
      } else {
        // Use the regular endpoint for all transactions (no months selected = show all)
        const response = await fetch(`/api/transactions/category/${category}`);
        
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        } else {
          // Use mock data for demonstration
          setTransactions(getMockTransactions());
        }
      }
    } catch (error) {
      console.error('Error fetching category transactions:', error);
      // Show mock transactions for demonstration
      setTransactions(getMockTransactions());
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const categories = await response.json();
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCategoryChange = async (transactionId, newCategory) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/category`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: newCategory }),
      });

      if (response.ok) {
        // Update the transaction in the local state
        setTransactions(prev => 
          prev.map(txn => 
            txn.id === transactionId 
              ? { ...txn, category: newCategory } 
              : txn
          )
        );
        setEditingTransaction(null);
      } else {
        console.error('Failed to update transaction category');
      }
    } catch (error) {
      console.error('Error updating transaction category:', error);
    }
  };

  const handleCreateRule = (transaction) => {
    setSelectedTransactionForRule(transaction);
    setShowRuleModal(true);
  };

  const handleSaveRule = async (ruleData) => {
    try {
      const response = await fetch('/api/category-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        setShowRuleModal(false);
        setSelectedTransactionForRule(null);
        // Optionally refresh data or show success message
      } else {
        console.error('Failed to create category rule');
      }
    } catch (error) {
      console.error('Error creating category rule:', error);
    }
  };

  const getMockTransactions = () => {
    return [
      {
        id: 1,
        date: '2025-06-15',
        description: 'Sample Transaction 1',
        account_type: 'amex',
        amount: 125.50,
        category: category
      },
      {
        id: 2,
        date: '2025-06-10',
        description: 'Sample Transaction 2',
        account_type: 'citi',
        amount: 89.99,
        category: category
      },
      {
        id: 3,
        date: '2025-05-28',
        description: 'Sample Transaction 3',
        account_type: 'amex',
        amount: 234.75,
        category: category
      }
    ];
  };

  const renderTransactions = () => {
    if (loading) {
      return (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading transactions...</p>
      );
    }

    if (!transactions || transactions.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <p>📋 No transactions found for {categoryName}</p>
          <p style={{ fontSize: '0.9rem' }}>Upload bank statements to see transaction details</p>
        </div>
      );
    }

    // Group transactions by month
    const groupedTransactions = {};
    transactions.forEach(txn => {
      const month = new Date(txn.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!groupedTransactions[month]) {
        groupedTransactions[month] = [];
      }
      groupedTransactions[month].push(txn);
    });

    return Object.keys(groupedTransactions).map(month => {
      const monthTransactions = groupedTransactions[month];
      const monthTotal = monthTransactions.reduce((sum, txn) => sum + txn.amount, 0);
      
      return (
        <div key={month} style={{ marginBottom: '2rem' }}>
          <h4 style={{ 
            color: '#2c3e50', 
            marginBottom: '1rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <span>📅 {month}</span>
            <span style={{ fontSize: '1rem', color: '#e74c3c' }}>{formatCurrency(monthTotal)}</span>
          </h4>
          <div className="table-container">
            <table style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {monthTransactions.map((txn, index) => (
                  <tr key={txn.id || index}>
                    <td>{new Date(txn.date).toLocaleDateString()}</td>
                    <td>{txn.description}</td>
                    <td>{txn.account_type ? txn.account_type.toUpperCase() : 'N/A'}</td>
                    <td>
                      {editingTransaction === txn.id ? (
                        <select 
                          value={txn.category} 
                          onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                          style={{ padding: '4px', fontSize: '0.8rem' }}
                        >
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {categoryEmojis[cat]} {cat.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>
                          {categoryEmojis[txn.category]} {txn.category?.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td className="money negative">{formatCurrency(txn.amount)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {editingTransaction === txn.id ? (
                          <button 
                            onClick={() => setEditingTransaction(null)}
                            style={{ padding: '2px 6px', fontSize: '0.8rem', background: '#ccc', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => setEditingTransaction(txn.id)}
                              style={{ padding: '2px 6px', fontSize: '0.8rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleCreateRule(txn)}
                              style={{ padding: '2px 6px', fontSize: '0.8rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                              title="Create category rule based on this transaction"
                            >
                              + Rule
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    });
  };

  if (!isOpen) return null;

  const emoji = categoryEmojis[category] || '❓';

  return (
    <div className="modal" style={{ display: 'block' }} onClick={handleOutsideClick}>
      <div className="modal-content" style={{ maxWidth: '1200px', width: '90%' }}>
        <div className="modal-header">
          <h3>{emoji} {categoryName} Transactions</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          {renderTransactions()}
        </div>
      </div>

      {/* Rule Creation Modal */}
      {showRuleModal && selectedTransactionForRule && (
        <RuleCreationModal
          transaction={selectedTransactionForRule}
          availableCategories={availableCategories}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleModal(false);
            setSelectedTransactionForRule(null);
          }}
        />
      )}
    </div>
  );
};

// Rule Creation Modal Component
const RuleCreationModal = ({ transaction, availableCategories, onSave, onClose }) => {
  const [ruleData, setRuleData] = useState({
    pattern: '',
    category: transaction.category || '',
    priority: 5
  });

  useEffect(() => {
    // Extract potential patterns from transaction description
    const description = transaction.description || '';
    const words = description.split(' ').filter(word => word.length > 2);
    // Use the first meaningful word as default pattern
    if (words.length > 0) {
      setRuleData(prev => ({ ...prev, pattern: words[0].toUpperCase() }));
    }
  }, [transaction]);

  // Handle ESC key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const handleOutsideClick = (event) => {
    if (event.target.classList.contains('modal')) {
      onClose();
    }
  };

  const handleSave = () => {
    if (ruleData.pattern && ruleData.category) {
      onSave(ruleData);
    }
  };

  return (
    <div className="modal" style={{ display: 'block', zIndex: 1100 }} onClick={handleOutsideClick}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>🏷️ Create Category Rule</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Transaction:</strong> {transaction.description}</p>
            <p><strong>Current Category:</strong> {categoryEmojis[transaction.category]} {transaction.category?.replace(/_/g, ' ')}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Pattern (text to match in future transactions):
              </label>
              <input
                type="text"
                value={ruleData.pattern}
                onChange={(e) => setRuleData({ ...ruleData, pattern: e.target.value })}
                placeholder="e.g., WOOLWORTHS, UBER, NETFLIX"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
              <small style={{ color: '#666' }}>
                This pattern will be used to automatically categorize future transactions containing this text.
              </small>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Category:
              </label>
              <select
                value={ruleData.category}
                onChange={(e) => setRuleData({ ...ruleData, category: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' }}
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Priority:
              </label>
              <input
                type="number"
                value={ruleData.priority}
                onChange={(e) => setRuleData({ ...ruleData, priority: parseInt(e.target.value) })}
                min="0"
                max="10"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
              <small style={{ color: '#666' }}>
                Higher numbers have higher priority (0-10). Default is 5.
              </small>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!ruleData.pattern || !ruleData.category}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: ruleData.pattern && ruleData.category ? '#28a745' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: ruleData.pattern && ruleData.category ? 'pointer' : 'not-allowed' 
                }}
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;