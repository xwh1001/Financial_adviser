import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header.jsx';
import SummaryGrid from './components/SummaryGrid.jsx';
import Overview from './components/Overview.jsx';
import Monthly from './components/Monthly.jsx';
import Categories from './components/Categories.jsx';
import Insights from './components/Insights.jsx';
import HouseGoal from './components/HouseGoal.jsx';
import CategoryModal from './components/CategoryModal.jsx';
import Settings from './components/Settings.jsx';
import ProgressDialog from './components/ProgressDialog.jsx';
import FileUpload from './components/FileUpload.jsx';

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState({ isOpen: false, category: null, categoryName: '', selectedMonths: [], selectedYear: new Date().getFullYear() });
  const [showSettings, setShowSettings] = useState(false);
  const [userSettings, setUserSettings] = useState({});
  const [progressDialog, setProgressDialog] = useState({ isOpen: false, title: '', message: '' });
  const [showFileUpload, setShowFileUpload] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        // Use mock data if no processed data available
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const processFiles = async () => {
    // New approach: open file upload modal instead of processing existing files
    setShowFileUpload(true);
  };

  const handleUploadComplete = async () => {
    // Reload dashboard data after successful upload
    await loadDashboardData();
  };

  const openCategoryModal = (category, categoryName, selectedMonths = [], selectedYear = new Date().getFullYear()) => {
    setModalData({ isOpen: true, category, categoryName, selectedMonths, selectedYear });
  };

  const closeCategoryModal = () => {
    setModalData({ isOpen: false, category: null, categoryName: '', selectedMonths: [], selectedYear: new Date().getFullYear() });
  };

  const handleSettingsUpdate = (newSettings) => {
    setUserSettings(newSettings);
    // Reload dashboard data to reflect new settings
    loadDashboardData();
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview dashboardData={dashboardData} />;
      case 'monthly':
        return <Monthly dashboardData={dashboardData} />;
      case 'categories':
        return <Categories dashboardData={dashboardData} onCategoryClick={openCategoryModal} />;
      case 'insights':
        return <Insights dashboardData={dashboardData} />;
      case 'piggybank':
        return <HouseGoal dashboardData={dashboardData} userSettings={userSettings} />;
      default:
        return <Overview dashboardData={dashboardData} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Financial Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <Header 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onProcessFiles={processFiles}
          onOpenSettings={() => setShowSettings(true)}
        />
        <SummaryGrid dashboardData={dashboardData} userSettings={userSettings} />
        <div className="content">
          {renderActiveSection()}
        </div>
      </div>
      
      <CategoryModal 
        isOpen={modalData.isOpen}
        category={modalData.category}
        categoryName={modalData.categoryName}
        selectedMonths={modalData.selectedMonths}
        selectedYear={modalData.selectedYear}
        onClose={closeCategoryModal}
      />
      
      <Settings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsUpdate={handleSettingsUpdate}
      />
      
      <ProgressDialog 
        isOpen={progressDialog.isOpen}
        title={progressDialog.title}
        message={progressDialog.message}
      />
      
      <FileUpload 
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}

export default App;