import React from 'react';

const LineChart = ({ data }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
        <p>📈 No data available for trends</p>
      </div>
    );
  }

  // Sort data by month and get last 8 months
  const sortedData = data.slice().sort((a, b) => a.month.localeCompare(b.month));
  const last8Months = sortedData.slice(-8);

  if (last8Months.length < 2) {
    return (
      <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
        <p>📈 Need at least 2 months of data for trends</p>
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...last8Months.map(m => Math.max(m.total_income || 0, m.total_expenses || 0))
  );

  if (maxValue === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
        <p>📈 No data available for trends</p>
      </div>
    );
  }

  // SVG dimensions
  const width = 600;
  const height = 260;
  const padding = 40;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Calculate points for each line
  const incomePoints = last8Months.map((month, index) => {
    const x = padding + (index * chartWidth) / (last8Months.length - 1);
    const y = padding + chartHeight - ((month.total_income || 0) / maxValue) * chartHeight;
    return { x, y, value: month.total_income || 0 };
  });

  const expensePoints = last8Months.map((month, index) => {
    const x = padding + (index * chartWidth) / (last8Months.length - 1);
    const y = padding + chartHeight - ((month.total_expenses || 0) / maxValue) * chartHeight;
    return { x, y, value: month.total_expenses || 0 };
  });

  const savingsPoints = last8Months.map((month, index) => {
    const x = padding + (index * chartWidth) / (last8Months.length - 1);
    const savings = (month.total_income || 0) - (month.total_expenses || 0);
    const normalizedSavings = Math.max(0, savings);
    const y = padding + chartHeight - (normalizedSavings / maxValue) * chartHeight;
    return { x, y, value: savings };
  });

  // Create path strings
  const incomePath = incomePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const expensePath = expensePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const savingsPath = savingsPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="line-chart-container">
      <div className="chart-wrapper">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="line-chart-svg">
          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = padding + (i * chartHeight) / 4;
            return (
              <line
                key={i}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
            );
          })}

          {/* Y-axis labels */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = padding + (i * chartHeight) / 4;
            const value = maxValue * (1 - i / 4);
            return (
              <text
                key={i}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#666"
              >
                ${(value / 1000).toFixed(0)}k
              </text>
            );
          })}

          {/* Income line */}
          <path
            d={incomePath}
            stroke="#27ae60"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-line"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(39, 174, 96, 0.3))' }}
          />

          {/* Expense line */}
          <path
            d={expensePath}
            stroke="#e74c3c"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-line"
            style={{ 
              animationDelay: '0.5s',
              filter: 'drop-shadow(0 2px 4px rgba(231, 76, 60, 0.3))' 
            }}
          />

          {/* Savings line */}
          <path
            d={savingsPath}
            stroke="#3498db"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-line"
            style={{ 
              animationDelay: '1s',
              filter: 'drop-shadow(0 2px 4px rgba(52, 152, 219, 0.3))' 
            }}
          />

          {/* Data points */}
          {incomePoints.map((p, i) => (
            <circle
              key={`income-${i}`}
              cx={p.x}
              cy={p.y}
              r="5"
              fill="#27ae60"
              stroke="white"
              strokeWidth="2"
              className="chart-point"
              style={{ 
                animationDelay: `${1.5 + i * 0.1}s`,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                cursor: 'pointer'
              }}
            >
              <title>Income: {formatCurrency(p.value)}</title>
            </circle>
          ))}

          {expensePoints.map((p, i) => (
            <circle
              key={`expense-${i}`}
              cx={p.x}
              cy={p.y}
              r="5"
              fill="#e74c3c"
              stroke="white"
              strokeWidth="2"
              className="chart-point"
              style={{ 
                animationDelay: `${1.7 + i * 0.1}s`,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                cursor: 'pointer'
              }}
            >
              <title>Expenses: {formatCurrency(p.value)}</title>
            </circle>
          ))}

          {savingsPoints.map((p, i) => (
            <circle
              key={`savings-${i}`}
              cx={p.x}
              cy={p.y}
              r="5"
              fill="#3498db"
              stroke="white"
              strokeWidth="2"
              className="chart-point"
              style={{ 
                animationDelay: `${1.9 + i * 0.1}s`,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                cursor: 'pointer'
              }}
            >
              <title>Savings: {formatCurrency(p.value)}</title>
            </circle>
          ))}

          {/* X-axis labels */}
          {last8Months.map((month, index) => {
            const x = padding + (index * chartWidth) / (last8Months.length - 1);
            return (
              <text
                key={index}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
              >
                {month.month.slice(-2)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '15px', color: '#666', fontSize: '0.9rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '3px', background: '#27ae60', borderRadius: '2px' }}></div>
          💰 Income
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '3px', background: '#e74c3c', borderRadius: '2px' }}></div>
          💸 Expenses
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '3px', background: '#3498db', borderRadius: '2px' }}></div>
          💵 Net Savings
        </span>
      </div>
    </div>
  );
};

export default LineChart;