import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../utils/sharedFormatters';

const Insights = ({ dashboardData }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    fetchAvailableYearsFromBackend();
  }, []);

  // Set initial selected month when dashboard data is available
  useEffect(() => {
    if (dashboardData && dashboardData.monthlyData && !selectedMonth) {
      // Find the most recent month for the current year, or default to current month if available
      const currentYear = new Date().getFullYear();
      const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      
      const availableMonthsForCurrentYear = dashboardData.monthlyData
        .filter(summary => summary.month.startsWith(currentYear.toString()))
        .map(summary => summary.month)
        .sort()
        .reverse();
      
      if (availableMonthsForCurrentYear.includes(currentMonth)) {
        // If current month has data, use it
        setSelectedMonth(currentMonth);
      } else if (availableMonthsForCurrentYear.length > 0) {
        // Otherwise use the most recent available month for current year
        setSelectedMonth(availableMonthsForCurrentYear[0]);
      } else {
        // If no data for current year, use the most recent month overall
        const allAvailableMonths = dashboardData.monthlyData
          .map(summary => summary.month)
          .sort()
          .reverse();
        if (allAvailableMonths.length > 0) {
          setSelectedMonth(allAvailableMonths[0]);
          // Also update the year to match
          const mostRecentYear = parseInt(allAvailableMonths[0].split('-')[0]);
          setSelectedYear(mostRecentYear);
        }
      }
    }
  }, [dashboardData, selectedMonth]);

  useEffect(() => {
    if (selectedMonth) {
      loadInsights();
    }
  }, [selectedMonth, selectedYear]);

  const loadInsights = async () => {
    // Don't make API calls if no month is selected
    if (!selectedMonth) {
      console.log('⏸️ Skipping API call - no month selected');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get user's timezone and current date in their timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userDate = new Date().toLocaleString('en-CA', { 
        timeZone: userTimezone, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      
      // Send the single selected month as an array for backend compatibility
      const monthsToSend = selectedMonth ? [selectedMonth] : [];
      
      console.log('🔍 INSIGHTS API Request:', {
        months: monthsToSend,
        year: selectedYear,
        selectedMonth: selectedMonth,
        userTimezone: userTimezone,
        userDate: userDate
      });
      
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          months: monthsToSend, 
          year: selectedYear,
          userTimezone: userTimezone,
          userDate: userDate
        }),
      });
      
      if (!response.ok) {
        console.error('❌ API Response not OK:', response.status, response.statusText);
        throw new Error('Failed to load insights');
      }
      
      const data = await response.json();
      console.log('✅ API Response received:', data);
      console.log('📊 Insights data:', data.insights);
      console.log('🔢 Has data:', data.insights?.hasData);
      
      setInsights(data.insights);
    } catch (err) {
      console.error('❌ Error loading insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableYearsFromBackend = async () => {
    try {
      const response = await fetch('/api/available-years');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.years) {
          setAvailableYears(data.years);
        } else {
          // Fallback: use current and past few years
          const currentYear = new Date().getFullYear();
          setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
        }
      } else {
        // Fallback: use current and past few years  
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
      }
    } catch (error) {
      console.error('Error fetching available years:', error);
      // Fallback: use current and past few years
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
    }
  };

  // Get available years from dashboard data (same as Categories tab)
  const getAvailableYears = () => {
    // First, try to use the availableYears from backend API
    if (availableYears && availableYears.length > 0) {
      return availableYears;
    }
    
    // Fallback to dashboard data
    if (dashboardData && dashboardData.monthlyData && dashboardData.monthlyData.length > 0) {
      // Extract unique years from monthlyData
      const years = new Set();
      dashboardData.monthlyData.forEach(summary => {
        const year = parseInt(summary.month.split('-')[0]);
        years.add(year);
      });
      
      return Array.from(years).sort().reverse();
    }
    
    // Final fallback: return current and past few years
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  };

  // Get available months from dashboard data for selected year (only months with data)
  const getAvailableMonths = () => {
    // Always use dashboard data to show only months with actual transactions
    if (dashboardData && dashboardData.monthlyData && dashboardData.monthlyData.length > 0) {
      const filteredMonths = dashboardData.monthlyData
        .filter(summary => summary.month.startsWith(selectedYear.toString()))
        .map(summary => summary.month)
        .sort()
        .reverse();
      
      console.log(`📅 Available months for ${selectedYear}:`, filteredMonths);
      console.log('📊 All monthly data:', dashboardData.monthlyData.map(d => d.month));
      
      return filteredMonths;
    }
    
    // If no dashboard data, return empty array instead of fallback months
    return [];
  };

  const handleYearChange = (year) => {
    console.log(`🔄 Year changed to: ${year}`);
    setSelectedYear(year);
    
    // Update selected month to the first available month of the new year (only months with data)
    let availableMonths = [];
    if (dashboardData && dashboardData.monthlyData && dashboardData.monthlyData.length > 0) {
      availableMonths = dashboardData.monthlyData
        .filter(summary => summary.month.startsWith(year.toString()))
        .map(summary => summary.month)
        .sort()
        .reverse();
      
      console.log(`📅 Available months for ${year}:`, availableMonths);
      console.log('🗃️ All dashboard monthlyData:', dashboardData.monthlyData.map(d => d.month));
    }
    
    if (availableMonths.length > 0) {
      console.log(`✅ Setting selected month to: ${availableMonths[0]}`);
      setSelectedMonth(availableMonths[0]); // Most recent month first
    } else {
      console.log(`❌ No available months for ${year}, clearing selection`);
      setSelectedMonth(''); // Clear selection if no data available
    }
  };

  const handleMonthSelect = (month) => {
    console.log(`📅 Month selected: ${month}`);
    setSelectedMonth(month);
  };


  if (loading) {
    return (
      <section id="insights" className="section">
        <h2 className="section-title">💡 Financial Insights</h2>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Analyzing your spending patterns...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="insights" className="section">
        <h2 className="section-title">💡 Financial Insights</h2>
        <div className="error-container">
          <p>❌ {error}</p>
          <button onClick={loadInsights} className="retry-button">
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!insights || !insights.hasData) {
    return (
      <section id="insights" className="section">
        <h2 className="section-title">💡 Financial Insights</h2>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Ready to Unlock Your Financial Insights?</h3>
          <p>Upload some bank statements and payslips to get personalized insights!</p>
          <div className="next-steps">
            <h4>Next Steps:</h4>
            <ul>
              <li>Upload recent bank statements</li>
              <li>Add payslip information</li>
              <li>Let the system analyze your spending patterns</li>
              <li>Get personalized savings recommendations</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="insights" className="section">
      <h2 className="section-title">💡 Financial Insights</h2>
      
      {/* Year and Month Selector (single month selection) */}
      <div className="time-selector" style={{ marginBottom: '2rem' }}>
        <h3>Select Analysis Period ({selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No month selected'})</h3>
        
        {/* Year Selector */}
        <div className="year-selector" style={{ marginBottom: '1.5rem' }}>
          <h4>Select Year:</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {getAvailableYears().map(year => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: selectedYear === year ? '#007bff' : 'white',
                  color: selectedYear === year ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: selectedYear === year ? 'bold' : 'normal'
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        
        {/* Month Selector */}
        <div className="month-selector" style={{ marginBottom: '1.5rem' }}>
          <h4>Select Month for {selectedYear}:</h4>
          {(() => {
            const availableMonths = getAvailableMonths();
            console.log(`🎯 Rendering month selector for ${selectedYear}, available months:`, availableMonths);
            return availableMonths.length > 0;
          })() ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {getAvailableMonths().map(month => {
                  const date = new Date(month + '-01');
                  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(month)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        backgroundColor: selectedMonth === month ? '#007bff' : 'white',
                        color: selectedMonth === month ? 'white' : '#333',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedMonth === month ? 'bold' : 'normal'
                      }}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                Select a specific month to analyze spending patterns and insights for that period.
              </p>
            </>
          ) : (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px', 
              textAlign: 'center',
              color: '#666',
              border: '1px dashed #ddd'
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                📅 No transaction data available for {selectedYear}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
                Upload bank statements for this year to see monthly insights
              </p>
            </div>
          )}
        </div>
        
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px', 
          fontSize: '0.9rem',
          color: '#666'
        }}>
          <strong>📊 Benchmark Comparison:</strong> Your spending will be compared against official Australian Bureau of Statistics (ABS) household spending data to show you how you rank among other Australians.
        </div>
      </div>

      {/* Savings Opportunities */}
      {insights.savingsOpportunities && insights.savingsOpportunities.length > 0 && (
        <div className="insights-section">
          <h3>💰 Savings Opportunities</h3>
          <div className="savings-grid">
            {insights.savingsOpportunities.map((opportunity, index) => (
              <div key={opportunity.id} className={`card savings-opportunity priority-${opportunity.priority}`}>
                <div className="opportunity-header">
                  <h4>{opportunity.title}</h4>
                  <div className="priority-badge">{opportunity.priority} priority</div>
                </div>
                
                <div className="opportunity-potential">
                  <div className="monthly-savings">
                    {formatCurrency(opportunity.potential)}/month
                  </div>
                  <div className="annual-savings">
                    {formatCurrency(opportunity.annualSavings)}/year potential
                  </div>
                </div>

                <p className="opportunity-description">{opportunity.description}</p>
                <p className="opportunity-suggestion">{opportunity.suggestion}</p>

                <div className="action-plan">
                  <h5>Action Plan:</h5>
                  <ul>
                    {opportunity.actionPlan.map((action, actionIndex) => (
                      <li key={actionIndex}>{action}</li>
                    ))}
                  </ul>
                </div>

                <div className="opportunity-meta">
                  <span className="timeline">Timeline: {opportunity.timeline}</span>
                  <span className="difficulty">Difficulty: {opportunity.difficulty}</span>
                  <span className="confidence">Confidence: {formatPercentage(opportunity.confidence)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Patterns */}
      {insights.spendingPatterns && (
        <div className="insights-section">
          <h3>📊 Spending Patterns</h3>
          
          {insights.spendingPatterns.topCategories && (
            <div className="card">
              <h4>Top Spending Categories</h4>
              <div className="top-categories">
                {insights.spendingPatterns.topCategories.map((category, index) => (
                  <div key={category.category} className="category-item">
                    <span className="category-rank">#{index + 1}</span>
                    <span className="category-name">{category.formattedCategory || category.category.replace(/_/g, ' ')}</span>
                    <span className="category-amount">{category.formattedAmount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.spendingPatterns.insights && insights.spendingPatterns.insights.length > 0 && (
            <div className="card">
              <h4>Pattern Insights</h4>
              <ul className="pattern-insights">
                {insights.spendingPatterns.insights.map((insight, index) => (
                  <li key={index} className={`insight-item ${insight.actionable ? 'actionable' : ''}`}>
                    <span className="insight-message">{insight.message}</span>
                    {insight.suggestion && (
                      <span className="insight-suggestion">{insight.suggestion}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Australian Comparison */}
      {insights.australianComparison && (
        <div className="insights-section">
          <h3>🇦🇺 How You Compare to Australian Averages</h3>
          <div className="comparison-grid">
            {Object.entries(insights.australianComparison).map(([category, comparison]) => {
              if (comparison.userSpending === 0) return null;
              
              return (
                <div key={category} className={`card comparison-item performance-${comparison.performance}`}>
                  <div className="comparison-header">
                    <h4>{comparison.formattedName || category.replace(/_/g, ' ')}</h4>
                    <div className={`performance-badge ${comparison.performance}`}>
                      {comparison.performance}
                    </div>
                  </div>
                  
                  <div className="comparison-amounts">
                    <div className="user-amount">
                      <label>Your spending:</label>
                      <span>{formatCurrency(comparison.userSpending)}</span>
                    </div>
                    <div className="benchmark-amount">
                      <label>Australian average:</label>
                      <span>{formatCurrency(comparison.benchmark)}</span>
                    </div>
                  </div>

                  {comparison.savings > 0 && (
                    <div className="potential-savings">
                      <span>Potential monthly savings: {formatCurrency(comparison.savings)}</span>
                    </div>
                  )}

                  <div className="percentile">
                    You're in the {comparison.percentile}th percentile
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Benchmark Source Information */}
          {insights.australianComparison._benchmark_source && (
            <div className="card" style={{ marginTop: '1rem', background: '#f8f9fa', border: '1px solid #e9ecef' }}>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>📊 Benchmark Data Source</h5>
                <div><strong>Source:</strong> {insights.australianComparison._benchmark_source.source}</div>
                <div><strong>Period:</strong> {insights.australianComparison._benchmark_source.period}</div>
                <div><strong>Last Updated:</strong> {insights.australianComparison._benchmark_source.last_updated}</div>
                {insights.australianComparison._metadata && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Your Location:</strong> {insights.australianComparison._metadata.location} 
                    {insights.australianComparison._metadata.city && ` (${insights.australianComparison._metadata.city})`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Plan */}
      {insights.actionPlan && (
        <div className="insights-section">
          <h3>🎯 Your Personalized Action Plan</h3>
          
          <div className="action-plan-summary">
            <div className="potential-savings">
              <h4>Total Potential Savings</h4>
              <div className="savings-amounts">
                <div className="monthly">{formatCurrency(insights.actionPlan.totalPotentialSavings)}/month</div>
                <div className="annual">{formatCurrency(insights.actionPlan.annualPotential)}/year</div>
              </div>
            </div>
          </div>

          <div className="action-categories">
            {insights.actionPlan.quickWins && insights.actionPlan.quickWins.length > 0 && (
              <div className="action-category">
                <h4>⚡ Quick Wins (Easy Implementation)</h4>
                <div className="action-items">
                  {insights.actionPlan.quickWins.map((item, index) => (
                    <div key={item.id} className="action-item easy">
                      <h5>{item.title}</h5>
                      <div className="impact">{formatCurrency(item.potential)}/month impact</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.actionPlan.mediumTermGoals && insights.actionPlan.mediumTermGoals.length > 0 && (
              <div className="action-category">
                <h4>🎯 Medium-term Goals</h4>
                <div className="action-items">
                  {insights.actionPlan.mediumTermGoals.map((item, index) => (
                    <div key={item.id} className="action-item medium">
                      <h5>{item.title}</h5>
                      <div className="impact">{formatCurrency(item.potential)}/month impact</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {insights.actionPlan.implementationOrder && (
            <div className="implementation-order">
              <h4>📋 Implementation Order</h4>
              <ol className="implementation-list">
                {insights.actionPlan.implementationOrder.map((item) => (
                  <li key={item.id} className="implementation-item">
                    <span className="order-number">{item.order}</span>
                    <div className="item-details">
                      <h5>{item.title}</h5>
                      <div className="item-meta">
                        <span className="timeline">{item.timeline}</span>
                        <span className="impact">{formatCurrency(item.impact)}/month</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Budget Recommendations */}
      {insights.budgetRecommendations && insights.budgetRecommendations.length > 0 && (
        <div className="insights-section">
          <h3>💼 Budget Recommendations</h3>
          {insights.budgetRecommendations.map((recommendation, index) => (
            <div key={index} className="card budget-recommendation">
              <h4>{recommendation.title}</h4>
              
              {recommendation.type === 'no_income_data' && (
                <div className="no-income-data">
                  <p>{recommendation.message}</p>
                </div>
              )}

              {recommendation.type === 'budget_framework' && (
                <div className="budget-framework">
                  <div className="budget-comparison">
                    <div className="current-budget">
                      <h5>Your Current Budget</h5>
                      <div className="budget-item">
                        <span>Needs: {formatCurrency(recommendation.current.needs)}</span>
                        <span>({(recommendation.current.needsPercentage || 0).toFixed(1)}%)</span>
                      </div>
                      <div className="budget-item">
                        <span>Wants: {formatCurrency(recommendation.current.wants)}</span>
                        <span>({(recommendation.current.wantsPercentage || 0).toFixed(1)}%)</span>
                      </div>
                      <div className="budget-item">
                        <span>Savings: {formatCurrency(recommendation.current.savings)}</span>
                        <span>({(recommendation.current.savingsPercentage || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="ideal-budget">
                      <h5>Recommended (50/30/20 Rule)</h5>
                      <div className="budget-item">
                        <span>Needs: {formatCurrency(recommendation.ideal.needs)}</span>
                        <span>(50%)</span>
                      </div>
                      <div className="budget-item">
                        <span>Wants: {formatCurrency(recommendation.ideal.wants)}</span>
                        <span>(30%)</span>
                      </div>
                      <div className="budget-item">
                        <span>Savings: {formatCurrency(recommendation.ideal.savings)}</span>
                        <span>(20%)</span>
                      </div>
                    </div>
                  </div>

                  {recommendation.adjustments && recommendation.adjustments.length > 0 && (
                    <div className="budget-adjustments">
                      <h5>Recommended Adjustments</h5>
                      {recommendation.adjustments.map((adjustment, adjIndex) => (
                        <div key={adjIndex} className="adjustment">
                          <p>{adjustment.message}</p>
                          {adjustment.categories && (
                            <div className="adjustment-categories">
                              <span>Focus on: </span>
                              {adjustment.categories.map((cat, catIndex) => (
                                <span key={catIndex} className="category-tag">
                                  {cat.formattedCategory || cat.category.replace(/_/g, ' ')} ({formatCurrency(cat.amount)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="insights-footer">
        <p className="disclaimer">
          💡 These insights are based on your spending patterns and Australian averages. 
          Consider your personal circumstances when implementing recommendations.
        </p>
        <p className="last-updated">
          Last updated: {new Date().toLocaleString('en-AU')}
        </p>
      </div>
    </section>
  );
};

export default Insights;