import React from 'react';

const HouseGoal = ({ dashboardData, userSettings }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Use settings or default values
  const houseGoalSettings = userSettings?.houseGoal || {
    housePrice: 1500000,
    depositPercentage: 35,
    targetYears: 5,
    stampDutyRate: 5.5,
    legalCosts: 5000
  };

  const housePrice = houseGoalSettings.housePrice;
  const depositPercentage = houseGoalSettings.depositPercentage / 100;
  const targetDeposit = housePrice * depositPercentage;

  // Calculate current savings - use manual balance if set, otherwise use summary data
  let currentSavings = 0;
  if (userSettings?.manualBalance?.currentBalance) {
    currentSavings = parseFloat(userSettings.manualBalance.currentBalance);
  } else if (dashboardData && dashboardData.summary) {
    currentSavings = dashboardData.summary.netSavings || 0;
  }

  const remaining = Math.max(0, targetDeposit - currentSavings);
  const progressPercentage = Math.min(100, (currentSavings / targetDeposit) * 100);

  // Calculate time to goal and scenarios
  const monthlySavingsRate = dashboardData && dashboardData.summary ? 
    (dashboardData.summary.netSavings / 12) : 3000; // Default to $3k/month

  const calculateTimeToGoal = (monthlyAmount) => {
    if (monthlyAmount <= 0 || remaining <= 0) return 'Goal achieved!';
    
    const months = Math.ceil(remaining / monthlyAmount);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0) {
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} year${years > 1 ? 's' : ''}`;
    } else {
      return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
  };

  // Monthly required calculation based on user settings
  const monthsRemaining = houseGoalSettings.targetYears * 12;
  const monthlyRequired = remaining / monthsRemaining;

  const scenarios = [
    { amount: 3000, label: '$3,000/month' },
    { amount: 5000, label: '$5,000/month' },
    { amount: 10000, label: '$10,000/month' }
  ];

  return (
    <section id="piggybank" className="section">
      <h2 className="section-title">🏠 House Purchase Goal</h2>
      
      <div className="piggybank-container">
        <div className="goal-summary large-card">
          <h3>🎯 Savings Goal Progress</h3>
          <p>Target: {formatCurrency(housePrice)} house with {(depositPercentage * 100).toFixed(0)}% deposit</p>
          {userSettings?.manualBalance?.currentBalance && (
            <p style={{ color: '#27ae60', fontSize: '0.9rem' }}>
              💳 Using manual balance override (updated: {new Date(userSettings.manualBalance.lastUpdated).toLocaleDateString()})
            </p>
          )}
          
          <div className="goal-details">
            <div className="goal-stat">
              <div className="goal-label">Target Deposit</div>
              <div className="goal-value">{formatCurrency(targetDeposit)}</div>
            </div>
            <div className="goal-stat">
              <div className="goal-label">Current Savings</div>
              <div className="goal-value">{formatCurrency(currentSavings)}</div>
            </div>
            <div className="goal-stat">
              <div className="goal-label">Remaining</div>
              <div className="goal-value">{formatCurrency(remaining)}</div>
            </div>
            <div className="goal-stat">
              <div className="goal-label">Progress</div>
              <div className="goal-value">{progressPercentage.toFixed(1)}%</div>
            </div>
          </div>

          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="projection-grid">
          <div className="card">
            <h3>⏱️ Time Projections</h3>
            <div className="projection-stat">
              <span className="projection-label">At current rate:</span>
              <span className="projection-value">{calculateTimeToGoal(monthlySavingsRate)}</span>
            </div>
            <div className="projection-stat">
              <span className="projection-label">Monthly required ({houseGoalSettings.targetYears} years):</span>
              <span className="projection-value">{formatCurrency(monthlyRequired)}</span>
            </div>
          </div>

          <div className="card">
            <h3>📊 Scenarios</h3>
            {scenarios.map(scenario => (
              <div key={scenario.amount} className="scenario">
                <span>{scenario.label}:</span>
                <span>{calculateTimeToGoal(scenario.amount)}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>💰 Cost Breakdown</h3>
            <div className="cost-breakdown">
              <div className="cost-item">
                <span>House Price:</span>
                <span>{formatCurrency(housePrice)}</span>
              </div>
              <div className="cost-item">
                <span>Deposit (35%):</span>
                <span>{formatCurrency(targetDeposit)}</span>
              </div>
              <div className="cost-item">
                <span>Mortgage Amount:</span>
                <span>{formatCurrency(housePrice - targetDeposit)}</span>
              </div>
              <div className="cost-item">
                <span>Stamp Duty ({houseGoalSettings.stampDutyRate}%):</span>
                <span>{formatCurrency(housePrice * houseGoalSettings.stampDutyRate / 100)}</span>
              </div>
              <div className="cost-item">
                <span>Legal/Inspection:</span>
                <span>{formatCurrency(houseGoalSettings.legalCosts)}</span>
              </div>
              <div className="cost-item total">
                <span>Total Upfront Cost:</span>
                <span>{formatCurrency(targetDeposit + (housePrice * houseGoalSettings.stampDutyRate / 100) + houseGoalSettings.legalCosts)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HouseGoal;