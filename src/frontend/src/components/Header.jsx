import React from 'react';

const Header = ({ activeSection, setActiveSection, onProcessFiles, onOpenSettings }) => {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'categories', label: 'Categories' },
    { id: 'insights', label: '💡 Insights' },
    { id: 'piggybank', label: 'House Goal' }
  ];

  return (
    <div className="header">
      <h1>Family Financial Dashboard</h1>
      <p>Centralized Financial Management System</p>
      <nav>
        {navItems.map(item => (
          <button
            key={item.id}
            data-section={item.id}
            className={`nav-btn ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          className="nav-btn process-files-btn"
          onClick={onProcessFiles}
        >
          📁 Process Uploaded Files
        </button>
        <button 
          className="nav-btn settings-btn"
          onClick={onOpenSettings}
        >
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
};

export default Header;