import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../utils/sharedFormatters';

const Insights = ({ dashboardData }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('lastmonth');

  useEffect(() => {
    loadInsights();
  }, [timeframe]);

  const loadInsights = async () => {
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
      
      const response = await fetch(`/api/insights?timeframe=${timeframe}&userTimezone=${encodeURIComponent(userTimezone)}&userDate=${userDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to load insights');
      }
      
      const data = await response.json();
      setInsights(data.insights);
    } catch (err) {
      console.error('Error loading insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      
      {/* Timeframe Selector */}
      <div className="timeframe-selector" style={{ marginBottom: '2rem' }}>
        <label htmlFor="timeframe">Analysis Period:</label>
        <select 
          id="timeframe" 
          value={timeframe} 
          onChange={(e) => setTimeframe(e.target.value)}
          style={{
            padding: '0.5rem',
            marginLeft: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        >
          <option value="lastmonth">Last Month</option>
          <option value="last3months">Last 3 Months</option>
          <option value="last6months">Last 6 Months</option>
          <option value="ytd">Year to Date</option>
        </select>
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
                    <span className="category-name">{category.category.replace(/_/g, ' ')}</span>
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
                    <h4>{category.replace(/_/g, ' ')}</h4>
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
                                  {cat.category.replace(/_/g, ' ')} ({formatCurrency(cat.amount)})
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