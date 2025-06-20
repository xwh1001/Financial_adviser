import React, { useState, useEffect, useRef } from 'react';
import { categoryEmojis, fatherCategoryIcons } from '../utils/categoryEmojis';

const Categories = ({ dashboardData, onCategoryClick }) => {
  // State for Monthly Analysis section
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  
  // State for Category Trend section
  const [activeTab, setActiveTab] = useState('monthly');
  const [selectedFatherCategories, setSelectedFatherCategories] = useState([]);
  const [fatherCategories, setFatherCategories] = useState({});
  const [groupedCategories, setGroupedCategories] = useState({});
  const [categoryTrendData, setCategoryTrendData] = useState([]);
  const [yearlyTransactions, setYearlyTransactions] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('ytd');
  const chartContainerRef = useRef(null);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Initialize component
  useEffect(() => {
    setSelectedMonths([]);
    fetchFatherCategories();
    fetchGroupedCategories();
  }, []);

  // Update data when dependencies change
  useEffect(() => {
    if (activeTab === 'monthly') {
      if (!dashboardData) {
        // Mock data fallback for current month
        setFilteredCategories([
          { category: 'GROCERIES', amount: 1200, percentage: 40 },
          { category: 'DINING_OUT', amount: 800, percentage: 27 },
          { category: 'TRANSPORT_PUBLIC', amount: 500, percentage: 17 },
          { category: 'SHOPPING_CLOTHING', amount: 300, percentage: 10 },
          { category: 'UTILITIES_ENERGY', amount: 200, percentage: 6 },
          { category: 'ENTERTAINMENT', amount: 150, percentage: 5 },
          { category: 'HEALTHCARE', amount: 100, percentage: 3 },
          { category: 'SHOPPING_GENERAL', amount: 80, percentage: 2.5 }
        ].sort((a, b) => b.percentage - a.percentage));
        return;
      }
      fetchMonthlyData(selectedMonths);
    }
  }, [dashboardData, selectedMonths, activeTab]);

  useEffect(() => {
    if (activeTab === 'trend' && selectedFatherCategories.length > 0) {
      fetchFatherCategoryTrendData();
      fetchYearlyTransactionsByFatherCategories();
    }
  }, [selectedFatherCategories, activeTab, selectedTimeRange]);


  const fetchMonthlyData = async (months) => {
    try {
      // If no months selected, fetch all transactions (use existing categoryBreakdown)
      if (!months || months.length === 0) {
        if (dashboardData && dashboardData.categoryBreakdown) {
          setFilteredCategories(dashboardData.categoryBreakdown.sort((a, b) => b.percentage - a.percentage));
        } else {
          setFilteredCategories([]);
        }
        return;
      }

      const response = await fetch('/api/monthly-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ months }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setFilteredCategories(data.categories || []);
      } else {
        console.error('Failed to fetch monthly data');
        setFilteredCategories([]);
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setFilteredCategories([]);
    }
  };

  // Get available months from dashboard data
  const getAvailableMonths = () => {
    if (!dashboardData) {
      // Return current and past few months as fallback
      const months = [];
      const current = new Date();
      for (let i = 0; i < 12; i++) {
        const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
        months.push(date.toISOString().slice(0, 7));
      }
      return months;
    }
    
    // Extract unique months from monthlyData (monthlySummaries)
    if (dashboardData.monthlyData && dashboardData.monthlyData.length > 0) {
      return dashboardData.monthlyData.map(summary => summary.month).sort().reverse();
    }
    
    // Fallback: extract months from YTD data
    const months = new Set();
    const currentYear = new Date().getFullYear();
    
    // Add months from current year going backwards
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, new Date().getMonth() - i, 1);
      months.add(date.toISOString().slice(0, 7));
    }
    
    return Array.from(months).sort().reverse();
  };

  const handleMonthToggle = (month) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  // New functions for Father Categories and Trend Analysis
  const fetchFatherCategories = async () => {
    try {
      const response = await fetch('/api/father-categories');
      if (response.ok) {
        const categories = await response.json();
        setFatherCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching father categories:', error);
    }
  };

  const fetchGroupedCategories = async () => {
    try {
      const response = await fetch('/api/categories-grouped');
      if (response.ok) {
        const grouped = await response.json();
        setGroupedCategories(grouped);
      }
    } catch (error) {
      console.error('Error fetching grouped categories:', error);
    }
  };

  const getTimeRangeParams = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedTimeRange) {
      case 'last3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = now;
        break;
      case 'last6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = now;
        break;
      case 'last1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        endDate = now;
        break;
      case 'ytd':
      default:
        startDate = new Date(now.getFullYear(), 0, 1); // January 1st
        endDate = now;
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const fetchFatherCategoryTrendData = async () => {
    try {
      // Get all child categories for selected father categories
      const allChildCategories = [];
      selectedFatherCategories.forEach(fatherCode => {
        if (groupedCategories[fatherCode] && groupedCategories[fatherCode].children) {
          allChildCategories.push(...groupedCategories[fatherCode].children);
        }
      });

      const timeRange = getTimeRangeParams();

      const response = await fetch('/api/category-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          categories: allChildCategories,
          startDate: timeRange.startDate,
          endDate: timeRange.endDate
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Group trends by father category
        const fatherTrends = selectedFatherCategories.map(fatherCode => {
          const childCategories = groupedCategories[fatherCode]?.children || [];
          const childTrends = data.trends.filter(trend => childCategories.includes(trend.category));
          
          // Aggregate monthly data for father category
          const monthlyData = {};
          childTrends.forEach(trend => {
            trend.monthlyData.forEach(monthData => {
              if (!monthlyData[monthData.month]) {
                monthlyData[monthData.month] = { month: monthData.month, amount: 0, transaction_count: 0 };
              }
              monthlyData[monthData.month].amount += monthData.amount;
              monthlyData[monthData.month].transaction_count += monthData.transaction_count;
            });
          });
          
          return {
            category: fatherCode,
            monthlyData: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
          };
        });
        
        setCategoryTrendData(fatherTrends);
      }
    } catch (error) {
      console.error('Error fetching father category trends:', error);
      setCategoryTrendData([]);
    }
  };

  const fetchYearlyTransactionsByFatherCategories = async () => {
    try {
      // Get all child categories for selected father categories
      const allChildCategories = [];
      selectedFatherCategories.forEach(fatherCode => {
        if (groupedCategories[fatherCode] && groupedCategories[fatherCode].children) {
          allChildCategories.push(...groupedCategories[fatherCode].children);
        }
      });

      const timeRange = getTimeRangeParams();

      const response = await fetch('/api/transactions-by-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          categories: allChildCategories,
          startDate: timeRange.startDate,
          endDate: timeRange.endDate
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setYearlyTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching yearly transactions:', error);
      setYearlyTransactions([]);
    }
  };

  const handleFatherCategoryToggle = (fatherCode) => {
    setSelectedFatherCategories(prev => 
      prev.includes(fatherCode) 
        ? prev.filter(c => c !== fatherCode)
        : [...prev, fatherCode]
    );
  };

  const renderSimpleChart = () => {
    if (categoryTrendData.length === 0) {
      return <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Select categories to see trend chart</div>;
    }

    // Filter data based on selected time range
    const timeRange = getTimeRangeParams();
    const startDate = new Date(timeRange.startDate);
    const endDate = new Date(timeRange.endDate);

    const filteredCategoryTrendData = categoryTrendData.map(catData => ({
      ...catData,
      monthlyData: catData.monthlyData.filter(monthData => {
        const monthDate = new Date(monthData.month + '-01');
        return monthDate >= startDate && monthDate <= endDate;
      })
    })).filter(catData => catData.monthlyData.length > 0);

    if (filteredCategoryTrendData.length === 0) {
      return <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No data available for selected time range</div>;
    }

    // Create a simple line chart using SVG
    const months = [...new Set(filteredCategoryTrendData.flatMap(cat => cat.monthlyData.map(d => d.month)))].sort();
    const maxAmount = Math.max(...filteredCategoryTrendData.flatMap(cat => cat.monthlyData.map(d => d.amount)));
    
    const chartHeight = 600;
    const chartWidth = 1000; // Use a larger fixed width for calculations
    const padding = 60;
    
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    
    return (
      <div style={{ width: '100%', padding: '1rem' }}>
        <svg 
          width="100%" 
          height={chartHeight} 
          style={{ border: '1px solid #ddd', borderRadius: '8px' }} 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line 
              key={i}
              x1={padding} 
              y1={padding + i * (chartHeight - 2 * padding) / 4} 
              x2={chartWidth - padding} 
              y2={padding + i * (chartHeight - 2 * padding) / 4}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          ))}
          
          {/* Y-axis labels with amounts */}
          {[0, 1, 2, 3, 4].map(i => {
            const value = maxAmount * (1 - i / 4);
            return (
              <text
                key={i}
                x={padding - 10}
                y={padding + i * (chartHeight - 2 * padding) / 4 + 5}
                textAnchor="end"
                fontSize="12"
                fill="#666"
              >
                ${Math.round(value).toLocaleString()}
              </text>
            );
          })}
          
          {/* Category trend lines */}
          {filteredCategoryTrendData.map((catData, catIndex) => {
            const points = catData.monthlyData.map((dataPoint, i) => {
              const x = padding + (i / (months.length - 1 || 1)) * (chartWidth - 2 * padding);
              const y = chartHeight - padding - (dataPoint.amount / maxAmount) * (chartHeight - 2 * padding);
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <g key={catData.category}>
                <polyline 
                  points={points}
                  fill="none"
                  stroke={colors[catIndex % colors.length]}
                  strokeWidth="3"
                />
                {catData.monthlyData.map((dataPoint, i) => {
                  const x = padding + (i / (months.length - 1 || 1)) * (chartWidth - 2 * padding);
                  const y = chartHeight - padding - (dataPoint.amount / maxAmount) * (chartHeight - 2 * padding);
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill={colors[catIndex % colors.length]}
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#333"
                        fontWeight="bold"
                      >
                        ${Math.round(dataPoint.amount).toLocaleString()}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          
          {/* X-axis labels with month/year format */}
          {months.map((month, i) => {
            const x = padding + (i / (months.length - 1 || 1)) * (chartWidth - 2 * padding);
            return (
              <text 
                key={month}
                x={x} 
                y={chartHeight - 20} 
                textAnchor="middle" 
                fontSize="12"
                fill="#666"
              >
                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </text>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem', gap: '1rem' }}>
          {filteredCategoryTrendData.map((catData, index) => (
            <div key={catData.category} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div 
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  backgroundColor: colors[index % colors.length],
                  borderRadius: '50%'
                }}
              ></div>
              <span style={{ fontSize: '0.9rem' }}>
                {fatherCategoryIcons[catData.category] || fatherCategories[catData.category]?.icon || '📦'} {fatherCategories[catData.category]?.name || catData.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section id="categories" className="section">
      <h2 className="section-title">Categories</h2>
      
      {/* Tab Navigation */}
      <div className="tabs" style={{ marginBottom: '2rem' }}>
        <button 
          className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
          style={{
            padding: '0.75rem 1.5rem',
            marginRight: '0.5rem',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: activeTab === 'monthly' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'monthly' ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          📊 Monthly Analysis
        </button>
        <button 
          className={`tab ${activeTab === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveTab('trend')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: activeTab === 'trend' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'trend' ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          📈 Category Trend
        </button>
      </div>

      {/* Monthly Analysis Tab */}
      {activeTab === 'monthly' && (
        <div>
          <h3>Monthly Analysis ({filteredCategories.length} categories)</h3>
          
          <div className="month-selector">
            <h4>Select Months:</h4>
            <div className="month-grid">
              {getAvailableMonths().map(month => {
                const date = new Date(month + '-01');
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <label key={month} className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month)}
                      onChange={() => handleMonthToggle(month)}
                    />
                    <span>{monthName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="category-breakdown">
            {Object.keys(groupedCategories).length > 0 ? (
              Object.entries(groupedCategories).map(([fatherCode, fatherInfo]) => {
                // Get categories for this father category
                const fatherCategories = filteredCategories.filter(cat => 
                  fatherInfo.children.includes(cat.category)
                );
                
                if (fatherCategories.length === 0) return null;
                
                const fatherTotal = fatherCategories.reduce((sum, cat) => sum + cat.amount, 0);
                
                return (
                  <div key={fatherCode} style={{ marginBottom: '2rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: '4px solid #007bff'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>{fatherInfo.icon}</span>
                      <h3 style={{ margin: 0, color: '#2c3e50' }}>{fatherInfo.name}</h3>
                      <span style={{ marginLeft: 'auto', fontSize: '1.2rem', fontWeight: 'bold', color: '#e74c3c' }}>
                        {formatCurrency(fatherTotal)}
                      </span>
                    </div>
                    
                    <div className="categories-grid">
                      {fatherCategories.map((cat, index) => {
                        const emoji = categoryEmojis[cat.category] || fatherInfo.icon;
                        const categoryName = cat.category.replace(/_/g, ' ').toLowerCase()
                          .replace(/\b\w/g, l => l.toUpperCase());
                        
                        return (
                          <div 
                            key={cat.category}
                            className="card category-card clickable-category"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onCategoryClick(cat.category, categoryName, selectedMonths)}
                          >
                            <div className="category-header">
                              <span className="category-emoji">{emoji}</span>
                              <h4 className="category-title">{categoryName}</h4>
                            </div>
                            <div className="category-amount">{formatCurrency(cat.amount)}</div>
                            <div className="category-percentage">{cat.percentage.toFixed(1)}% of spending</div>
                            <div className="category-bar">
                              <div 
                                className="category-fill" 
                                style={{ 
                                  width: `${Math.min(100, cat.percentage)}%`, 
                                  background: `linear-gradient(135deg, hsl(${200 + index * 15}, 65%, 55%), hsl(${200 + index * 15}, 65%, 70%))` 
                                }}
                              ></div>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                              Click to view transactions
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="categories-grid">
                {filteredCategories.map((cat, index) => {
                  const emoji = categoryEmojis[cat.category] || '❓';
                  const categoryName = cat.category.replace(/_/g, ' ').toLowerCase()
                    .replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <div 
                      key={cat.category}
                      className="card category-card clickable-category"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onCategoryClick(cat.category, categoryName, selectedMonths)}
                    >
                      <div className="category-header">
                        <span className="category-emoji">{emoji}</span>
                        <h4 className="category-title">{categoryName}</h4>
                      </div>
                      <div className="category-amount">{formatCurrency(cat.amount)}</div>
                      <div className="category-percentage">{cat.percentage.toFixed(1)}% of spending</div>
                      <div className="category-bar">
                        <div 
                          className="category-fill" 
                          style={{ 
                            width: `${Math.min(100, cat.percentage)}%`, 
                            background: `linear-gradient(135deg, hsl(${200 + index * 15}, 65%, 55%), hsl(${200 + index * 15}, 65%, 70%))` 
                          }}
                        ></div>
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                        Click to view transactions
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Trend Tab */}
      {activeTab === 'trend' && (
        <div>
          <h3>Category Trend Analysis</h3>
          
          {/* Time Range Selector */}
          <div style={{ marginBottom: '2rem' }}>
            <h4>Select Time Range:</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { value: 'ytd', label: 'Year to Date (Jan - Dec)' },
                { value: 'last3months', label: 'Last 3 Months' },
                { value: 'last6months', label: 'Last 6 Months' },
                { value: 'last1year', label: 'Last 1 Year' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTimeRange(option.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: selectedTimeRange === option.value ? '#007bff' : 'white',
                    color: selectedTimeRange === option.value ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: selectedTimeRange === option.value ? 'bold' : 'normal'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="father-category-selector" style={{ marginBottom: '2rem' }}>
            <h4>Select Father Categories to Compare:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
              {Object.entries(fatherCategories).map(([fatherCode, fatherInfo]) => {
                return (
                  <label key={fatherCode} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.75rem', 
                    border: '2px solid #ddd', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    backgroundColor: selectedFatherCategories.includes(fatherCode) ? '#e7f3ff' : 'white',
                    borderColor: selectedFatherCategories.includes(fatherCode) ? '#007bff' : '#ddd'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedFatherCategories.includes(fatherCode)}
                      onChange={() => handleFatherCategoryToggle(fatherCode)}
                    />
                    <span style={{ fontSize: '1.2rem' }}>{fatherInfo.icon}</span>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{fatherInfo.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{fatherInfo.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Trend Chart */}
          <div className="trend-chart" style={{ marginBottom: '2rem' }}>
            <h4>Monthly Spending Trends</h4>
            {renderSimpleChart()}
          </div>

          {/* Time Range Transactions */}
          {yearlyTransactions.length > 0 && (
            <div className="yearly-transactions">
              <h4>
                {selectedTimeRange === 'ytd' ? 'YTD' : 
                 selectedTimeRange === 'last3months' ? 'Last 3 Months' :
                 selectedTimeRange === 'last6months' ? 'Last 6 Months' :
                 selectedTimeRange === 'last1year' ? 'Last 1 Year' : 'Selected Range'} 
                Transactions ({yearlyTransactions.length} transactions)
              </h4>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Account</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyTransactions.map((txn, index) => (
                      <tr key={txn.id || index}>
                        <td>{new Date(txn.date).toLocaleDateString()}</td>
                        <td>{txn.description}</td>
                        <td>
                          {categoryEmojis[txn.category]} {txn.category?.replace(/_/g, ' ')}
                        </td>
                        <td className="money negative">{formatCurrency(txn.amount)}</td>
                        <td>{txn.account_type ? txn.account_type.toUpperCase() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Categories;