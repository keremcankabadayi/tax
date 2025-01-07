import React, { useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // 5 saniye sonra otomatik kapanır

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`notification ${type}`}>
      <div className="notification-content">
        {type === 'error' && <span className="notification-icon">⚠️</span>}
        {type === 'success' && <span className="notification-icon">✅</span>}
        {type === 'info' && <span className="notification-icon">ℹ️</span>}
        <span className="notification-message">{message}</span>
      </div>
      <button className="notification-close" onClick={onClose}>×</button>
    </div>
  );
};

export default Notification; 