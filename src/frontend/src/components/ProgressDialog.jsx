import React from 'react';

const ProgressDialog = ({ isOpen, title, message, showSpinner = true }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal" 
      style={{ 
        display: 'block', 
        zIndex: 9999, 
        backgroundColor: 'rgba(0, 0, 0, 0.6)' 
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '400px',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          border: 'none'
        }}
      >
        <div className="modal-body" style={{ padding: '2rem', textAlign: 'center' }}>
          {showSpinner && (
            <div 
              className="loading-spinner" 
              style={{ 
                margin: '0 auto 1.5rem auto',
                width: '40px',
                height: '40px'
              }}
            ></div>
          )}
          
          <h3 style={{ 
            marginBottom: '1rem', 
            color: '#2c3e50',
            fontSize: '1.3rem'
          }}>
            {title || 'Processing...'}
          </h3>
          
          <p style={{ 
            color: '#666', 
            marginBottom: '0',
            fontSize: '1rem',
            lineHeight: '1.4'
          }}>
            {message || 'Please wait while we process your request.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressDialog;