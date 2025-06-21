import React, { useState, useEffect } from 'react';
import CategoryRulesManager from './CategoryRulesManager';
import CategoryRuleBackup from './CategoryRuleBackup';
import ProgressDialog from './ProgressDialog';
import FileManagement from './FileManagement';

const Settings = ({ isOpen, onClose, onSettingsUpdate }) => {
  const [activeTab, setActiveTab] = useState('house-goal');
  const [settings, setSettings] = useState({});
  const [balanceAdjustments, setBalanceAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryRules, setShowCategoryRules] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [progressDialog, setProgressDialog] = useState({ isOpen: false, title: '', message: '' });

  // House Goal Settings
  const [houseGoal, setHouseGoal] = useState({
    housePrice: 1500000,
    depositPercentage: 35,
    targetYears: 5,
    stampDutyRate: 5.5,
    legalCosts: 5000
  });

  // Balance Adjustment
  const [newAdjustment, setNewAdjustment] = useState({
    adjustmentDate: new Date().toISOString().split('T')[0],
    adjustmentType: 'manual_correction',
    amount: '',
    description: ''
  });

  // Manual Balance Override
  const [manualBalance, setManualBalance] = useState({
    currentBalance: '',
    lastUpdated: ''
  });

  // Location Settings for ABS Benchmarks
  const [locationSettings, setLocationSettings] = useState({
    userLocation: 'victoria',
    userCity: 'melbourne'
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadBalanceAdjustments();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        
        if (data.houseGoal) {
          setHouseGoal(data.houseGoal);
        }
        
        if (data.manualBalance) {
          setManualBalance(data.manualBalance);
        }
        
        // Load location settings
        setLocationSettings({
          userLocation: data.user_location || 'victoria',
          userCity: data.user_city || 'melbourne'
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceAdjustments = async () => {
    try {
      const response = await fetch('/api/balance-adjustments');
      if (response.ok) {
        const data = await response.json();
        setBalanceAdjustments(data);
      }
    } catch (error) {
      console.error('Error loading balance adjustments:', error);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
        if (onSettingsUpdate) {
          onSettingsUpdate({ ...settings, [key]: value });
        }
      }
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const saveHouseGoal = async () => {
    await saveSetting('houseGoal', houseGoal);
    alert('House goal settings saved successfully!');
  };

  const saveManualBalance = async () => {
    const balanceData = {
      ...manualBalance,
      lastUpdated: new Date().toISOString()
    };
    await saveSetting('manualBalance', balanceData);
    setManualBalance(balanceData);
    alert('Manual balance updated successfully!');
  };

  const saveLocationSettings = async () => {
    await saveSetting('user_location', locationSettings.userLocation);
    await saveSetting('user_city', locationSettings.userCity);
    alert('Location settings saved successfully! This will update benchmark comparisons in INSIGHTS.');
  };

  const addBalanceAdjustment = async () => {
    if (!newAdjustment.amount || !newAdjustment.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/balance-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAdjustment,
          amount: parseFloat(newAdjustment.amount)
        })
      });

      if (response.ok) {
        await loadBalanceAdjustments();
        setNewAdjustment({
          adjustmentDate: new Date().toISOString().split('T')[0],
          adjustmentType: 'manual_correction',
          amount: '',
          description: ''
        });
        alert('Balance adjustment added successfully!');
      }
    } catch (error) {
      console.error('Error adding balance adjustment:', error);
    }
  };

  const deleteAdjustment = async (id) => {
    if (window.confirm('Are you sure you want to delete this adjustment?')) {
      try {
        const response = await fetch(`/api/balance-adjustments/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadBalanceAdjustments();
        }
      } catch (error) {
        console.error('Error deleting adjustment:', error);
      }
    }
  };

  const handleRefreshCategories = async () => {
    if (window.confirm('This will re-categorize ALL transactions based on current rules. This may take a few moments. Continue?')) {
      setProgressDialog({
        isOpen: true,
        title: 'Refreshing Categories',
        message: 'Re-categorizing all transactions based on current rules. This may take a few moments...'
      });
      
      try {
        const response = await fetch('/api/refresh-categories', {
          method: 'POST'
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`Categories refreshed successfully! Updated ${result.updatedCount} transactions.`);
        } else {
          const error = await response.json();
          alert(`Failed to refresh categories: ${error.message}`);
        }
      } catch (error) {
        console.error('Error refreshing categories:', error);
        alert('Error refreshing categories. Please try again.');
      } finally {
        setProgressDialog({ isOpen: false, title: '', message: '' });
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal" style={{ display: 'block' }}>
        <div className="modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh' }}>
          <div className="modal-header">
            <h3>⚙️ Settings & Configuration</h3>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e9ecef', marginBottom: '2rem' }}>
              {[
                { id: 'house-goal', label: '🏠 House Goal', emoji: '🏠' },
                { id: 'location', label: '📍 Location & Benchmarks', emoji: '📍' },
                { id: 'balance', label: '💰 Balance Management', emoji: '💰' },
                { id: 'categories', label: '🏷️ Category Rules', emoji: '🏷️' },
                { id: 'files', label: '📁 File Management', emoji: '📁' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: activeTab === tab.id ? '#3498db' : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#666',
                    border: 'none',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: activeTab === tab.id ? 'bold' : 'normal'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="loading-spinner"></div>
                <p>Loading settings...</p>
              </div>
            ) : (
              <>
                {/* House Goal Settings */}
                {activeTab === 'house-goal' && (
                  <div>
                    <h4>🏠 House Purchase Goal Configuration</h4>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>
                      Customize your house purchase goals and calculations.
                    </p>

                    <div className="card" style={{ marginBottom: '2rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                          <label>🏠 Target House Price:</label>
                          <input
                            type="number"
                            value={houseGoal.housePrice}
                            onChange={(e) => setHouseGoal({ ...houseGoal, housePrice: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                          <small style={{ color: '#666' }}>Current: {formatCurrency(houseGoal.housePrice)}</small>
                        </div>

                        <div>
                          <label>💰 Deposit Percentage:</label>
                          <input
                            type="number"
                            value={houseGoal.depositPercentage}
                            onChange={(e) => setHouseGoal({ ...houseGoal, depositPercentage: parseInt(e.target.value) })}
                            min="5"
                            max="50"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                          <small style={{ color: '#666' }}>
                            Deposit needed: {formatCurrency(houseGoal.housePrice * houseGoal.depositPercentage / 100)}
                          </small>
                        </div>

                        <div>
                          <label>⏰ Target Timeline (Years):</label>
                          <input
                            type="number"
                            value={houseGoal.targetYears}
                            onChange={(e) => setHouseGoal({ ...houseGoal, targetYears: parseInt(e.target.value) })}
                            min="1"
                            max="20"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                          <small style={{ color: '#666' }}>Time frame: {houseGoal.targetYears} years</small>
                        </div>

                        <div>
                          <label>📋 Stamp Duty Rate (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={houseGoal.stampDutyRate}
                            onChange={(e) => setHouseGoal({ ...houseGoal, stampDutyRate: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                          <small style={{ color: '#666' }}>
                            Stamp duty: {formatCurrency(houseGoal.housePrice * houseGoal.stampDutyRate / 100)}
                          </small>
                        </div>

                        <div>
                          <label>⚖️ Legal & Inspection Costs:</label>
                          <input
                            type="number"
                            value={houseGoal.legalCosts}
                            onChange={(e) => setHouseGoal({ ...houseGoal, legalCosts: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                          <small style={{ color: '#666' }}>Legal fees: {formatCurrency(houseGoal.legalCosts)}</small>
                        </div>
                      </div>

                      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                        <h5>📊 Updated Calculations:</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          <div>
                            <strong>Deposit Required:</strong><br />
                            {formatCurrency(houseGoal.housePrice * houseGoal.depositPercentage / 100)}
                          </div>
                          <div>
                            <strong>Total Upfront Cost:</strong><br />
                            {formatCurrency(
                              houseGoal.housePrice * houseGoal.depositPercentage / 100 +
                              houseGoal.housePrice * houseGoal.stampDutyRate / 100 +
                              houseGoal.legalCosts
                            )}
                          </div>
                          <div>
                            <strong>Monthly Savings Needed:</strong><br />
                            {formatCurrency(
                              (houseGoal.housePrice * houseGoal.depositPercentage / 100) / (houseGoal.targetYears * 12)
                            )}
                          </div>
                          <div>
                            <strong>Mortgage Amount:</strong><br />
                            {formatCurrency(houseGoal.housePrice * (100 - houseGoal.depositPercentage) / 100)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={saveHouseGoal}
                        className="nav-btn"
                        style={{ marginTop: '1rem', background: '#27ae60', color: 'white' }}
                      >
                        💾 Save House Goal Settings
                      </button>
                    </div>
                  </div>
                )}

                {/* Location Settings */}
                {activeTab === 'location' && (
                  <div>
                    <h4>📍 Location & Benchmark Settings</h4>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>
                      Configure your location to get accurate spending benchmarks from the Australian Bureau of Statistics (ABS).
                    </p>

                    <div className="card" style={{ marginBottom: '2rem' }}>
                      <h5>🇦🇺 Australian Location Settings</h5>
                      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Your location determines which official ABS spending benchmarks are used in the INSIGHTS tab.
                        Victoria residents get Victoria-specific data, while other states use Australia-wide averages.
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            🏛️ State/Territory:
                          </label>
                          <select
                            value={locationSettings.userLocation}
                            onChange={(e) => setLocationSettings({ ...locationSettings, userLocation: e.target.value })}
                            style={{ 
                              width: '100%', 
                              padding: '8px', 
                              borderRadius: '4px', 
                              border: '1px solid #ddd',
                              backgroundColor: 'white'
                            }}
                          >
                            <option value="victoria">Victoria</option>
                            <option value="nsw">New South Wales</option>
                            <option value="queensland">Queensland</option>
                            <option value="sa">South Australia</option>
                            <option value="wa">Western Australia</option>
                            <option value="tasmania">Tasmania</option>
                            <option value="nt">Northern Territory</option>
                            <option value="act">Australian Capital Territory</option>
                          </select>
                          <small style={{ color: '#666' }}>
                            {locationSettings.userLocation === 'victoria' ? 
                              'Victoria-specific ABS data available' : 
                              'Using Australia-wide ABS data'}
                          </small>
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            🏙️ City (Cost of Living Adjustment):
                          </label>
                          <select
                            value={locationSettings.userCity}
                            onChange={(e) => setLocationSettings({ ...locationSettings, userCity: e.target.value })}
                            style={{ 
                              width: '100%', 
                              padding: '8px', 
                              borderRadius: '4px', 
                              border: '1px solid #ddd',
                              backgroundColor: 'white'
                            }}
                            disabled={locationSettings.userLocation !== 'victoria'}
                          >
                            {locationSettings.userLocation === 'victoria' ? (
                              <>
                                <option value="melbourne">Melbourne</option>
                                <option value="geelong">Geelong</option>
                                <option value="ballarat">Ballarat</option>
                                <option value="bendigo">Bendigo</option>
                                <option value="regional_victoria">Regional Victoria</option>
                              </>
                            ) : (
                              <option value="">Select state first</option>
                            )}
                          </select>
                          <small style={{ color: '#666' }}>
                            {locationSettings.userLocation === 'victoria' ? 
                              'Adjusts benchmarks for local cost of living' : 
                              'City selection available for Victoria only'}
                          </small>
                        </div>

                        <button
                          onClick={saveLocationSettings}
                          className="nav-btn"
                          style={{ 
                            background: '#27ae60', 
                            color: 'white',
                            padding: '12px 24px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          💾 Save Location
                        </button>
                      </div>

                      <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '8px', marginTop: '1rem' }}>
                        <h6>📊 Current Benchmark Source:</h6>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                          <strong>Data Source:</strong> Australian Bureau of Statistics (ABS) Monthly Household Spending Indicator<br />
                          <strong>Period:</strong> April 2025<br />
                          <strong>Your Benchmarks:</strong> {locationSettings.userLocation === 'victoria' ? 'Victoria-specific data' : 'Australia-wide averages'}
                          {locationSettings.userLocation === 'victoria' && (
                            <>
                              <br /><strong>Cost Adjustment:</strong> {locationSettings.userCity} multiplier applied
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', marginTop: '1rem' }}>
                        <h6>ℹ️ How This Affects Your INSIGHTS:</h6>
                        <ul style={{ marginTop: '0.5rem', fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
                          <li><strong>Benchmark Comparisons:</strong> Your spending is compared against official ABS data for your location</li>
                          <li><strong>Performance Ratings:</strong> "Excellent", "Good", "Average" ratings based on where you rank among other Australians</li>
                          <li><strong>Savings Opportunities:</strong> Identifies categories where you spend significantly above average</li>
                          <li><strong>Regional Accuracy:</strong> Victoria residents get more accurate benchmarks specific to their state</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Balance Management */}
                {activeTab === 'balance' && (
                  <div>
                    <h4>💰 Balance Management</h4>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>
                      Manually adjust your current balance and track balance corrections.
                    </p>

                    {/* Manual Balance Override */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                      <h5>💳 Current Balance Override</h5>
                      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Set your actual current balance based on real bank account balances.
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                        <div>
                          <label>Current Balance:</label>
                          <input
                            type="number"
                            step="0.01"
                            value={manualBalance.currentBalance}
                            onChange={(e) => setManualBalance({ ...manualBalance, currentBalance: e.target.value })}
                            placeholder="Enter actual balance"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div>
                          <small style={{ color: '#666' }}>
                            Last updated: {manualBalance.lastUpdated ? 
                              new Date(manualBalance.lastUpdated).toLocaleDateString() : 'Never'}
                          </small>
                        </div>
                        <button
                          onClick={saveManualBalance}
                          disabled={!manualBalance.currentBalance}
                          className="nav-btn"
                          style={{ 
                            background: manualBalance.currentBalance ? '#27ae60' : '#bdc3c7',
                            color: 'white'
                          }}
                        >
                          💾 Update Balance
                        </button>
                      </div>
                    </div>

                    {/* Balance Adjustments */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                      <h5>📊 Balance Adjustments</h5>
                      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Record manual adjustments to account for cash transactions, missed payments, etc.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 120px 1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
                        <div>
                          <label>Date:</label>
                          <input
                            type="date"
                            value={newAdjustment.adjustmentDate}
                            onChange={(e) => setNewAdjustment({ ...newAdjustment, adjustmentDate: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div>
                          <label>Type:</label>
                          <select
                            value={newAdjustment.adjustmentType}
                            onChange={(e) => setNewAdjustment({ ...newAdjustment, adjustmentType: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          >
                            <option value="manual_correction">Manual Correction</option>
                            <option value="cash_transaction">Cash Transaction</option>
                            <option value="missing_transaction">Missing Transaction</option>
                            <option value="bank_fee">Bank Fee</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label>Amount ($):</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newAdjustment.amount}
                            onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: e.target.value })}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div>
                          <label>Description:</label>
                          <input
                            type="text"
                            value={newAdjustment.description}
                            onChange={(e) => setNewAdjustment({ ...newAdjustment, description: e.target.value })}
                            placeholder="Reason for adjustment"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <button
                          onClick={addBalanceAdjustment}
                          disabled={!newAdjustment.amount || !newAdjustment.description}
                          className="nav-btn"
                          style={{ 
                            background: newAdjustment.amount && newAdjustment.description ? '#27ae60' : '#bdc3c7',
                            color: 'white'
                          }}
                        >
                          ➕ Add
                        </button>
                      </div>

                      {/* Existing Adjustments */}
                      {balanceAdjustments.length > 0 && (
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {balanceAdjustments.map(adj => (
                                <tr key={adj.id}>
                                  <td>{new Date(adj.adjustment_date).toLocaleDateString()}</td>
                                  <td>
                                    <span style={{ 
                                      background: adj.adjustment_type === 'manual_correction' ? '#3498db' : 
                                                adj.adjustment_type === 'cash_transaction' ? '#f39c12' : '#95a5a6',
                                      color: 'white',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.8rem'
                                    }}>
                                      {adj.adjustment_type.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                  </td>
                                  <td className={adj.amount >= 0 ? 'money positive' : 'money negative'}>
                                    {formatCurrency(adj.amount)}
                                  </td>
                                  <td>{adj.description}</td>
                                  <td>
                                    <button
                                      onClick={() => deleteAdjustment(adj.id)}
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
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Category Management */}
                {activeTab === 'categories' && (
                  <CategoryManagement 
                    onRefreshCategories={handleRefreshCategories}
                    onShowCategoryRules={() => setShowCategoryRules(true)}
                    loading={loading}
                    pendingChanges={pendingChanges}
                    setPendingChanges={setPendingChanges}
                    refreshing={refreshing}
                    setRefreshing={setRefreshing}
                    progressDialog={progressDialog}
                    setProgressDialog={setProgressDialog}
                  />
                )}

                {/* File Management */}
                {activeTab === 'files' && (
                  <FileManagement />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Rules Manager Modal */}
      <CategoryRulesManager 
        isOpen={showCategoryRules}
        onClose={() => setShowCategoryRules(false)}
      />
      
      {/* Progress Dialog */}
      <ProgressDialog 
        isOpen={progressDialog.isOpen}
        title={progressDialog.title}
        message={progressDialog.message}
      />
    </>
  );
};

// Category Management Component
const CategoryManagement = ({ onRefreshCategories, onShowCategoryRules, loading, pendingChanges, setPendingChanges, refreshing, setRefreshing, progressDialog, setProgressDialog }) => {
  const [customCategories, setCustomCategories] = useState({});
  const [defaultCategories, setDefaultCategories] = useState({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKeywords, setNewCategoryKeywords] = useState('');
  const [selectedFatherCategory, setSelectedFatherCategory] = useState('');
  const [fatherCategories, setFatherCategories] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  
  // User Data Backup Management
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [showBackupSection, setShowBackupSection] = useState(false);

  useEffect(() => {
    loadCustomCategories();
    loadDefaultCategories();
    loadFatherCategories();
    if (showBackupSection) {
      loadBackups();
    }
  }, [showBackupSection]);

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

  const loadDefaultCategories = async () => {
    try {
      const response = await fetch('/api/default-categories');
      if (response.ok) {
        const data = await response.json();
        setDefaultCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading default categories:', error);
    }
  };

  const loadFatherCategories = async () => {
    try {
      const response = await fetch('/api/father-categories');
      if (response.ok) {
        const data = await response.json();
        setFatherCategories(data);
      }
    } catch (error) {
      console.error('Error loading father categories:', error);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/user-data/backups');
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const handleExportUserData = async () => {
    setProgressDialog({
      isOpen: true,
      title: 'Exporting User Data',
      message: 'Creating backup of all user-defined transaction data...'
    });

    try {
      const response = await fetch('/api/user-data/export', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`User data exported successfully!\n\nFile: ${result.filename}\nCategory overrides: ${result.stats.categoryOverrides}\nBalance adjustments: ${result.stats.balanceAdjustments}\nUser settings: ${result.stats.userSettings}`);
        loadBackups(); // Refresh backup list
      } else {
        const error = await response.json();
        alert(`Export failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error exporting user data:', error);
      alert('Error exporting user data. Please try again.');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };

  const handleImportUserData = async () => {
    if (!selectedBackup) {
      alert('Please select a backup file to import');
      return;
    }

    if (!confirm(`Import user data from backup?\n\nFile: ${selectedBackup}\n\nThis will restore category overrides, balance adjustments, and settings from the selected backup.\n\nContinue?`)) {
      return;
    }

    setProgressDialog({
      isOpen: true,
      title: 'Importing User Data',
      message: 'Restoring user-defined transaction data from backup...'
    });

    try {
      const response = await fetch('/api/user-data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedBackup })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`User data imported successfully!\n\nCategory overrides: ${result.stats.categoryOverrides}\nBalance adjustments: ${result.stats.balanceAdjustments}\nUser settings: ${result.stats.userSettings}\n\nPage will reload to show updated data.`);
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error importing user data:', error);
      alert('Error importing user data. Please try again.');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!confirm(`Delete backup file?\n\nFile: ${filename}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user-data/backups/${filename}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Backup deleted successfully');
        loadBackups(); // Refresh backup list
        if (selectedBackup === filename) {
          setSelectedBackup('');
        }
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Error deleting backup. Please try again.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryKeywords.trim()) {
      alert('Please enter both category name and keywords');
      return;
    }

    if (!selectedFatherCategory) {
      alert('Please select a father category');
      return;
    }

    // Check for duplicate category names
    const categoryNameUpper = newCategoryName.toUpperCase();
    const existingCategories = Object.keys(customCategories);
    if (existingCategories.includes(categoryNameUpper)) {
      alert('Category name already exists');
      return;
    }

    const keywords = newCategoryKeywords.split(',').map(k => k.trim().toUpperCase()).filter(k => k);
    
    try {
      // Add category
      const response = await fetch(`/api/custom-categories/${categoryNameUpper}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });
      
      if (response.ok) {
        // Map to father category
        const mappingResponse = await fetch('/api/category-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            childCategory: categoryNameUpper, 
            fatherCategory: selectedFatherCategory 
          })
        });

        if (mappingResponse.ok) {
          await loadCustomCategories();
          // Don't force refresh - let user decide when to apply changes
          setNewCategoryName('');
          setNewCategoryKeywords('');
          setSelectedFatherCategory('');
          setPendingChanges(true);
          alert('Category added successfully! Click "Apply Changes" to re-categorize transactions.');
        } else {
          alert('Category added but failed to map to father category');
        }
      } else {
        alert('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category');
    }
  };

  const handleUpdateCategory = async (categoryName, keywords) => {
    try {
      const response = await fetch(`/api/custom-categories/${categoryName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });
      
      if (response.ok) {
        await loadCustomCategories();
        // Don't force refresh - let user decide when to apply changes
        setEditingCategory(null);
        setPendingChanges(true);
        alert('Category updated successfully! Click "Apply Changes" to re-categorize transactions.');
      } else {
        alert('Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category');
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!confirm(`Are you sure you want to delete the ${categoryName} category?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-categories/${categoryName}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadCustomCategories();
        // Don't force refresh - let user decide when to apply changes
        setPendingChanges(true);
        alert('Category deleted successfully! Click "Apply Changes" to re-categorize transactions.');
      } else {
        alert('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    }
  };

  const refreshCategoriesAndReload = async () => {
    if (pendingChanges && !confirm('This will re-categorize ALL transactions using current category rules. This may take a while. Continue?')) {
      return;
    }
    
    setProgressDialog({
      isOpen: true,
      title: 'Applying Category Changes',
      message: 'Re-categorizing all transactions using updated category rules. This may take a while...'
    });
    
    try {
      const response = await fetch('/api/refresh-categories', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setPendingChanges(false); // Clear pending changes flag
        alert(`Categories refreshed successfully! Updated ${result.updatedCount} transactions.`);
      } else {
        const error = await response.json();
        alert(`Failed to refresh categories: ${error.message}`);
      }
    } catch (error) {
      console.error('Error refreshing categories:', error);
      alert('Error refreshing categories');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Are you sure you want to restore all categories to defaults? This will overwrite all custom changes.')) {
      return;
    }

    try {
      const response = await fetch('/api/custom-categories/restore-defaults', {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadCustomCategories();
        await refreshCategoriesAndReload();
        alert('Categories restored to defaults successfully!');
      } else {
        alert('Failed to restore defaults');
      }
    } catch (error) {
      console.error('Error restoring defaults:', error);
      alert('Error restoring defaults');
    }
  };

  const handleHardRefresh = async () => {
    if (!confirm('⚠️ HARD REFRESH WARNING ⚠️\n\nThis will:\n• Delete ALL transactions and income data\n• Delete ALL processed file tracking\n• Re-parse and re-import ALL files from scratch\n\nThis process may take several minutes and cannot be undone.\n\nAre you absolutely sure you want to continue?')) {
      return;
    }

    setProgressDialog({
      isOpen: true,
      title: 'Hard Refresh in Progress',
      message: 'Clearing all data and re-processing all files. This may take several minutes...'
    });

    try {
      const response = await fetch('/api/hard-refresh', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Hard refresh completed successfully!\n\nRe-processed ${result.filesProcessed} files.\nPlease refresh the page to see updated data.`);
        // Optionally reload the page to refresh all data
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Hard refresh failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error during hard refresh:', error);
      alert('Error during hard refresh. Please try again.');
    } finally {
      setProgressDialog({ isOpen: false, title: '', message: '' });
    }
  };


  return (
    <div>
      <h4>🏷️ Category Management</h4>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Create and manage custom categories for transaction classification.
      </p>

      {/* Action Buttons */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={onShowCategoryRules}
            className="nav-btn"
            style={{ background: '#3498db', color: 'white', padding: '12px 24px' }}
          >
            🏷️ Manage Category Rules
          </button>
          
          <button
            onClick={refreshCategoriesAndReload}
            className="nav-btn"
            style={{ 
              background: pendingChanges ? '#f39c12' : '#e74c3c', 
              color: 'white', 
              padding: '12px 24px',
              border: pendingChanges ? '2px solid #e67e22' : 'none',
              fontWeight: pendingChanges ? 'bold' : 'normal'
            }}
            disabled={loading || refreshing}
          >
            {pendingChanges ? '⚠️ Apply Changes' : '🔄 Refresh Categories'}
            {refreshing && ' (Processing...)'}
          </button>

          <button
            onClick={handleRestoreDefaults}
            className="nav-btn"
            style={{ background: '#6c757d', color: 'white', padding: '12px 24px' }}
          >
            🔄 Restore Defaults
          </button>

          <button
            onClick={handleHardRefresh}
            className="nav-btn"
            style={{ 
              background: '#dc3545', 
              color: 'white', 
              padding: '12px 24px',
              border: '2px solid #c82333',
              fontWeight: 'bold'
            }}
            disabled={loading || refreshing}
          >
            ⚠️ Hard Refresh Database
          </button>
          
          {refreshing && <span style={{ color: '#007bff', alignSelf: 'center' }}>Refreshing...</span>}
        </div>
      </div>

      {/* Category Rules Backup & Restore */}
      <CategoryRuleBackup />

      {/* User Data Backup Management */}
      <div className="card" style={{ marginBottom: '2rem', background: '#f8f9fa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h5>💾 User Data Backup & Restore</h5>
          <button
            onClick={() => setShowBackupSection(!showBackupSection)}
            className="nav-btn"
            style={{ 
              background: showBackupSection ? '#6c757d' : '#17a2b8', 
              color: 'white', 
              padding: '8px 16px' 
            }}
          >
            {showBackupSection ? 'Hide' : 'Show'} Backup Manager
          </button>
        </div>

        {showBackupSection && (
          <div>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Backup and restore your manual transaction modifications, category overrides, balance adjustments, and settings.
            </p>

            {/* Export/Import Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportUserData}
                className="nav-btn"
                style={{ background: '#28a745', color: 'white', padding: '10px 20px' }}
                disabled={loading || refreshing}
              >
                📤 Export User Data
              </button>

              <button
                onClick={handleImportUserData}
                className="nav-btn"
                style={{ 
                  background: selectedBackup ? '#007bff' : '#6c757d', 
                  color: 'white', 
                  padding: '10px 20px',
                  opacity: selectedBackup ? 1 : 0.6,
                  cursor: selectedBackup ? 'pointer' : 'not-allowed'
                }}
                disabled={!selectedBackup || loading || refreshing}
              >
                📥 Import Selected Backup
              </button>
            </div>

            {/* Backup List */}
            {backups.length > 0 && (
              <div>
                <h6>Available Backups ({backups.length})</h6>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                  {backups.map((backup, index) => (
                    <div 
                      key={backup.filename}
                      style={{ 
                        padding: '1rem',
                        borderBottom: index < backups.length - 1 ? '1px solid #eee' : 'none',
                        backgroundColor: selectedBackup === backup.filename ? '#e3f2fd' : 'white',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedBackup(backup.filename)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="radio"
                              checked={selectedBackup === backup.filename}
                              onChange={() => setSelectedBackup(backup.filename)}
                            />
                            <strong>{backup.filename}</strong>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Created: {new Date(backup.created).toLocaleString()}<br />
                            Overrides: {backup.stats.categoryOverrides}, 
                            Adjustments: {backup.stats.balanceAdjustments}, 
                            Settings: {backup.stats.userSettings}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBackup(backup.filename);
                          }}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {backups.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>📂 No backup files found</p>
                <p style={{ fontSize: '0.9rem' }}>Create your first backup by clicking "Export User Data"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Category */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h5>➕ Add New Category</h5>
        
        {/* Father Category Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            👨‍👧‍👦 Select Father Category (Required):
          </label>
          <select
            value={selectedFatherCategory}
            onChange={(e) => setSelectedFatherCategory(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: selectedFatherCategory ? '1px solid #28a745' : '2px solid #dc3545', 
              borderRadius: '4px',
              backgroundColor: selectedFatherCategory ? '#f8fff8' : '#fff5f5'
            }}
          >
            <option value="">-- Choose a Father Category --</option>
            {Object.entries(fatherCategories).map(([code, info]) => (
              <option key={code} value={code}>
                {info.icon} {info.name} - {info.description}
              </option>
            ))}
          </select>
          {!selectedFatherCategory && (
            <p style={{ fontSize: '0.8rem', color: '#dc3545', margin: '0.25rem 0 0 0' }}>
              ⚠️ Father category selection is mandatory for new categories
            </p>
          )}
        </div>

        {/* Category Name and Keywords */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Category Name (e.g., CUSTOM_CATEGORY)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
            style={{ 
              flex: 1, 
              padding: '0.5rem', 
              border: '1px solid #ccc', 
              borderRadius: '4px' 
            }}
          />
          <input
            type="text"
            placeholder="Keywords (comma separated, e.g., KEYWORD1, KEYWORD2)"
            value={newCategoryKeywords}
            onChange={(e) => setNewCategoryKeywords(e.target.value)}
            style={{ 
              flex: 2, 
              padding: '0.5rem', 
              border: '1px solid #ccc', 
              borderRadius: '4px' 
            }}
          />
          <button 
            onClick={handleAddCategory}
            className="nav-btn"
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: selectedFatherCategory ? '#28a745' : '#6c757d', 
              color: 'white',
              opacity: selectedFatherCategory ? 1 : 0.6,
              cursor: selectedFatherCategory ? 'pointer' : 'not-allowed'
            }}
            disabled={!selectedFatherCategory}
          >
            Add Category
          </button>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          <strong>Example:</strong> Category: "HOBBY_MUSIC", Keywords: "SPOTIFY, APPLE MUSIC, GUITAR, PIANO, CONCERT"
        </p>
      </div>

      {/* Current Categories */}
      <div className="card">
        <h5>📂 Current Categories ({Object.keys(customCategories).length})</h5>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {Object.entries(customCategories).map(([categoryName, keywords]) => (
            <div key={categoryName} style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>{categoryName}</strong>
                <div>
                  <button 
                    onClick={() => setEditingCategory(editingCategory === categoryName ? null : categoryName)}
                    className="nav-btn"
                    style={{ 
                      padding: '0.25rem 0.5rem', 
                      marginRight: '0.5rem',
                      backgroundColor: '#ffc107', 
                      color: 'black',
                      fontSize: '0.9rem'
                    }}
                  >
                    {editingCategory === categoryName ? 'Cancel' : 'Edit'}
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(categoryName)}
                    className="nav-btn"
                    style={{ 
                      padding: '0.25rem 0.5rem', 
                      backgroundColor: '#dc3545', 
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {editingCategory === categoryName ? (
                <EditCategoryForm 
                  categoryName={categoryName}
                  keywords={keywords}
                  onSave={handleUpdateCategory}
                  onCancel={() => setEditingCategory(null)}
                />
              ) : (
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  <strong>Keywords:</strong> {keywords.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Information */}
      <div className="card" style={{ marginTop: '2rem', background: '#e3f2fd' }}>
        <h5>ℹ️ How Categories Work</h5>
        <ul style={{ color: '#666', fontSize: '0.9rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>Custom Categories:</strong> Create categories for your specific needs (hobbies, work expenses, etc.)</li>
          <li><strong>Keywords:</strong> Transaction descriptions are matched against these keywords</li>
          <li><strong>Auto-categorization:</strong> New transactions are automatically assigned categories based on keywords</li>
          <li><strong>Category Rules:</strong> Create advanced rules with priorities for precise categorization</li>
          <li><strong>Refresh:</strong> Apply category changes to all existing transactions</li>
        </ul>
      </div>

      {/* Hard Refresh Information */}
      <div className="card" style={{ marginTop: '1rem', background: '#fff5f5', border: '1px solid #fed7d7' }}>
        <h5>⚠️ Hard Refresh Database</h5>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <strong>Warning:</strong> This is a destructive operation that cannot be undone.
        </p>
        <ul style={{ color: '#666', fontSize: '0.9rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>Clears ALL data:</strong> Removes all transactions, income, and monthly summaries</li>
          <li><strong>Re-processes files:</strong> Parses all PDF files from scratch (bank statements, payslips)</li>
          <li><strong>Use cases:</strong> Fix corrupted data, change parsing logic, or start fresh</li>
          <li><strong>Duration:</strong> May take several minutes depending on the number of files</li>
          <li><strong>Smart parsing:</strong> Files are only re-parsed when necessary to avoid duplicates</li>
          <li><strong>User data backup:</strong> Automatically backs up your manual changes before clearing</li>
        </ul>
      </div>

      {/* User Data Backup Information */}
      <div className="card" style={{ marginTop: '1rem', background: '#f0f8ff', border: '1px solid #b8daff' }}>
        <h5>💾 User Data Backup System</h5>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <strong>Protects your manual changes:</strong> Automatically preserves user modifications during hard refresh.
        </p>
        <ul style={{ color: '#666', fontSize: '0.9rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>Auto-backup:</strong> Hard refresh automatically creates backups before clearing data</li>
          <li><strong>Manual backup:</strong> Export your user data anytime using the backup manager</li>
          <li><strong>Preserved data:</strong> Category overrides, balance adjustments, user settings, custom rules</li>
          <li><strong>Storage location:</strong> Backups saved to user-data/ folder with timestamps</li>
          <li><strong>Restore options:</strong> Import any backup file to restore previous modifications</li>
        </ul>
      </div>
    </div>
  );
};

// Edit Category Form Component
const EditCategoryForm = ({ categoryName, keywords, onSave, onCancel }) => {
  const [editKeywords, setEditKeywords] = useState(keywords.join(', '));

  const handleSave = () => {
    const keywordArray = editKeywords.split(',').map(k => k.trim().toUpperCase()).filter(k => k);
    onSave(categoryName, keywordArray);
  };

  return (
    <div>
      <input
        type="text"
        value={editKeywords}
        onChange={(e) => setEditKeywords(e.target.value)}
        style={{ 
          width: '100%', 
          padding: '0.5rem', 
          border: '1px solid #ccc', 
          borderRadius: '4px',
          marginBottom: '0.5rem'
        }}
        placeholder="Keywords (comma separated)"
      />
      <div>
        <button 
          onClick={handleSave}
          className="nav-btn"
          style={{ 
            padding: '0.25rem 0.5rem', 
            marginRight: '0.5rem',
            backgroundColor: '#28a745', 
            color: 'white',
            fontSize: '0.9rem'
          }}
        >
          Save
        </button>
        <button 
          onClick={onCancel}
          className="nav-btn"
          style={{ 
            padding: '0.25rem 0.5rem', 
            backgroundColor: '#6c757d', 
            color: 'white',
            fontSize: '0.9rem'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Settings;