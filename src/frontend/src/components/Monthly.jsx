import React from 'react';
import LineChart from './charts/LineChart';

const Monthly = ({ dashboardData }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getMonthlyData = () => {
    if (dashboardData && dashboardData.monthlyData) {
      return dashboardData.monthlyData;
    }
    
    // Mock data fallback
    return [
      { month: '2025-06', total_income: 9716, total_expenses: 2400, transaction_count: 18 },
      { month: '2025-05', total_income: 9716, total_expenses: 3200, transaction_count: 25 },
      { month: '2025-04', total_income: 9716, total_expenses: 2800, transaction_count: 22 }
    ];
  };

  const monthlyData = getMonthlyData();
  const currentMonth = monthlyData[0] || {};

  // Calculate averages
  const avgIncome = monthlyData.reduce((sum, m) => sum + (m.total_income || 0), 0) / monthlyData.length;
  const avgExpenses = monthlyData.reduce((sum, m) => sum + (m.total_expenses || 0), 0) / monthlyData.length;
  const bestMonth = monthlyData.reduce((best, m) => 
    (m.total_income - m.total_expenses) > (best.total_income - best.total_expenses) ? m : best, monthlyData[0]);

  return (
    <section id="monthly" className="section">
      <h2 className="section-title">Monthly Breakdown</h2>
      
      <div className="monthly-container">
        <div className="monthly-chart-container">
          <h3>📈 Monthly Income vs Expenses Trend</h3>
          <LineChart data={monthlyData} />
        </div>
        
        <div className="monthly-stats">
          <div className="card">
            <h3>This Month</h3>
            <div className="stat-row">
              <span>Income:</span>
              <span className="money positive">{formatCurrency(currentMonth.total_income || 0)}</span>
            </div>
            <div className="stat-row">
              <span>Expenses:</span>
              <span className="money negative">{formatCurrency(currentMonth.total_expenses || 0)}</span>
            </div>
            <div className="stat-row">
              <span>Savings:</span>
              <span className="money">{formatCurrency((currentMonth.total_income || 0) - (currentMonth.total_expenses || 0))}</span>
            </div>
          </div>
          
          <div className="card">
            <h3>Averages</h3>
            <div className="stat-row">
              <span>Monthly Income:</span>
              <span className="money positive">{formatCurrency(avgIncome)}</span>
            </div>
            <div className="stat-row">
              <span>Monthly Expenses:</span>
              <span className="money negative">{formatCurrency(avgExpenses)}</span>
            </div>
            <div className="stat-row">
              <span>Best Month:</span>
              <span>{bestMonth.month || '--'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="monthly-table-container">
        <h3>Monthly Summary</h3>
        <div className="table-container">
          <table className="monthly-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Savings</th>
                <th>Savings Rate</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(month => {
                const savingsRate = month.total_income > 0 ? 
                  ((month.total_income - month.total_expenses) / month.total_income * 100).toFixed(1) : '0.0';
                
                return (
                  <tr key={month.month}>
                    <td>{month.month}</td>
                    <td className="money positive">{formatCurrency(month.total_income)}</td>
                    <td className="money negative">{formatCurrency(month.total_expenses)}</td>
                    <td className="money">{formatCurrency(month.total_income - month.total_expenses)}</td>
                    <td>{savingsRate}%</td>
                    <td>{month.transaction_count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Monthly;