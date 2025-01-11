import React from 'react';
import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="warning-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn-danger" onClick={onConfirm}>Sıfırla</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 