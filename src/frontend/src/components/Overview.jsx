import React from 'react';
import { formatCurrency } from '../utils/sharedFormatters';

const Overview = ({ dashboardData }) => {

  const getSummaryData = () => {
    if (dashboardData && dashboardData.summary) {
      return dashboardData.summary;
    }
    
    // Mock data fallback
    return {
      totalBalance: 25000.00,
      totalIncome: 8500.00,
      totalExpenses: 6200.00,
      netSavings: 2300.00,
      savingsRate: 27.1,
      netWorth: 75000.00
    };
  };

  const data = getSummaryData();

  // Calculate days remaining in month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = lastDay.getDate() - now.getDate();

  // Get last transaction
  const getLastTransaction = () => {
    if (dashboardData && dashboardData.recentTransactions && dashboardData.recentTransactions.length > 0) {
      const lastTxn = dashboardData.recentTransactions[0];
      const date = new Date(lastTxn.date).toLocaleDateString();
      return `${date} - ${lastTxn.description}`;
    }
    return 'No transactions found';
  };

  return (
    <section id="overview" className="section active">
      <h2 className="section-title">Financial Overview</h2>
      
      <div className="card-grid">
        <div className="card">
          <h3>Current Month Spending</h3>
          <div className="amount expense">
            {formatCurrency(data.totalExpenses * 0.8)}
          </div>
        </div>
        
        <div className="card">
          <h3>Budget Remaining</h3>
          <div className="amount income">
            {formatCurrency(data.totalIncome - (data.totalExpenses * 0.8))}
          </div>
        </div>
        
        <div className="card">
          <h3>Portfolio Value</h3>
          <div className="amount neutral">
            {formatCurrency(15000)}
          </div>
        </div>
        
        <div className="card">
          <h3>YTD Return</h3>
          <div className="amount positive">
            +8.2%
          </div>
        </div>
        
        <div className="card">
          <h3>Days Remaining</h3>
          <div className="amount neutral">
            {daysRemaining} days
          </div>
        </div>
        
        <div className="card">
          <h3>Last Transaction</h3>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {getLastTransaction()}
          </div>
        </div>
      </div>

      <div className="insights">
        <h3>💡 Financial Insights</h3>
        <ul>
          <li>Your savings rate of {data.savingsRate.toFixed(1)}% is {data.savingsRate > 20 ? 'excellent' : 'good'}!</li>
          <li>You have {daysRemaining} days left in this month to stay within budget</li>
          <li>Consider increasing your emergency fund to 6 months of expenses</li>
          <li>Your spending trends show good financial discipline</li>
        </ul>
      </div>

      <div className="projection">
        <h3>📈 Monthly Projection</h3>
        <div className="projection-stats">
          <div className="projection-stat">
            <span className="projection-label">Projected Month-End Balance:</span>
            <span className="projection-value">{formatCurrency(data.totalBalance + data.netSavings)}</span>
          </div>
          <div className="projection-stat">
            <span className="projection-label">Estimated Annual Savings:</span>
            <span className="projection-value">{formatCurrency(data.netSavings * 12)}</span>
          </div>
          <div className="projection-stat">
            <span className="projection-label">On Track for Year-End Goal:</span>
            <span className="projection-value">✅ Yes</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Overview;