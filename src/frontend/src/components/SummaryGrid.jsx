import React from 'react';

const SummaryGrid = ({ dashboardData, userSettings }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getSummaryData = () => {
    let data;
    if (dashboardData && dashboardData.summary) {
      data = { ...dashboardData.summary };
    } else {
      // Mock data fallback
      data = {
        totalBalance: 25000.00,
        totalIncome: 8500.00,
        totalExpenses: 6200.00,
        netSavings: 2300.00,
        savingsRate: 27.1,
        netWorth: 75000.00
      };
    }
    
    // Override with manual balance if set
    if (userSettings?.manualBalance?.currentBalance) {
      data.totalBalance = parseFloat(userSettings.manualBalance.currentBalance);
      data.netWorth = data.totalBalance + 50000; // Estimate other assets
    }
    
    return data;
  };

  const data = getSummaryData();

  const summaryItems = [
    { id: 'total-balance', label: 'Total Balance', value: data.totalBalance },
    { id: 'monthly-income', label: 'YTD Income', value: data.totalIncome },
    { id: 'monthly-expenses', label: 'YTD Expenses', value: data.totalExpenses },
    { id: 'net-savings', label: 'Net Savings', value: data.netSavings },
    { id: 'savings-rate', label: 'Savings Rate', value: `${data.savingsRate.toFixed(1)}%`, isPercentage: true },
    { id: 'net-worth', label: 'Net Worth', value: data.netWorth }
  ];

  return (
    <div className="summary-grid">
      {summaryItems.map(item => (
        <div key={item.id} className="summary-item">
          <div className="summary-value">
            {item.isPercentage ? item.value : formatCurrency(item.value)}
          </div>
          <div className="summary-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

export default SummaryGrid;