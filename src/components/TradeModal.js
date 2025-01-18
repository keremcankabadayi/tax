import React, { useState, useEffect } from 'react';
import './TradeModal.css';

const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const TradeModal = ({ 
  isOpen, 
  onClose, 
  trade, 
  onSave, 
  onChange, 
  isEditing,
  getExchangeRateForDate,
  remainingShares,
  getAvailableSymbols,
  today
}) => {
  const [quantityError, setQuantityError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuantityError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const calculateTotalAmount = () => {
    const exchangeRate = getExchangeRateForDate(trade.date) || 0;
    const quantity = trade.type === 'Temettü' ? 1 : Number(trade.quantity);
    const amount = Number(trade.price) * exchangeRate * quantity;
    return formatNumber(amount.toFixed(2));
  };

  const getFormattedExchangeRate = () => {
    return formatNumber((getExchangeRateForDate(trade.date) || 0).toFixed(2));
  };

  const getLastYearRange = () => {
    const date = new Date();
    const lastYear = date.getFullYear() - 1;
    return {
      start: `${lastYear}-01-01`,
      end: `${lastYear}-12-31`
    };
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (trade.type === 'Satış' && trade.symbol) {
      const maxQuantity = isEditing 
        ? (remainingShares[trade.symbol] || 0) + Number(trade.quantity)
        : remainingShares[trade.symbol] || 0;
        
      if (Number(value) > maxQuantity) {
        setQuantityError(`Maksimum ${maxQuantity} adet satabilirsiniz`);
      } else {
        setQuantityError('');
      }
    }
    onChange(e);
  };

  const handleChange = (e) => {
    if (e.target.name === 'type' || e.target.name === 'symbol') {
      setQuantityError('');
    }
    onChange(e);
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      onChange({ target: { name: 'date', value: selectedDate } });
    }
  };

  const handleSave = () => {
    if (trade.type === 'Satış' && trade.symbol) {
      const maxQuantity = isEditing 
        ? (remainingShares[trade.symbol] || 0) + Number(trade.quantity)
        : remainingShares[trade.symbol] || 0;
        
      if (Number(trade.quantity) > maxQuantity) {
        setQuantityError(`Maksimum ${maxQuantity} adet satabilirsiniz`);
        return;
      }
    }
    onSave();
  };

  const dateRange = getLastYearRange();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>İşlem Tarihi</label>
            <input
              type="date"
              name="date"
              value={trade.date}
              onChange={handleDateChange}
              min={dateRange.start}
              max={dateRange.end}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>İşlem Tipi</label>
            <select
              name="type"
              value={trade.type}
              onChange={handleChange}
              className="form-control"
            >
              <option value="Alış">Alış</option>
              <option value="Satış">Satış</option>
              <option value="Temettü">Temettü</option>
            </select>
          </div>

          <div className="form-group">
            <label>Sembol</label>
            {trade.type === 'Alış' ? (
              <input
                type="text"
                name="symbol"
                value={trade.symbol}
                onChange={handleChange}
                placeholder="AAPL"
                className="form-control"
              />
            ) : (
              <select
                name="symbol"
                value={trade.symbol}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">Sembol Seçin</option>
                {getAvailableSymbols().map(symbol => (
                  <option key={symbol} value={symbol}>
                    {symbol} ({remainingShares[symbol] || 0} adet)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Adet</label>
            {trade.type === 'Temettü' ? (
              <input
                type="number"
                name="quantity"
                value={remainingShares[trade.symbol] || ''}
                disabled
                className="form-control"
              />
            ) : (
              <>
                <input
                  type="number"
                  name="quantity"
                  value={trade.quantity}
                  onChange={handleQuantityChange}
                  placeholder={trade.type === 'Satış' && trade.symbol ? `Max: ${remainingShares[trade.symbol] || 0}` : "100"}
                  className={`form-control ${quantityError ? 'error' : ''}`}
                />
                {quantityError && <div className="error-message">{quantityError}</div>}
              </>
            )}
          </div>

          <div className="form-group">
            <label>
              {trade.type === 'Alış' ? 'Alış Fiyatı ($)' : 
               trade.type === 'Satış' ? 'Satış Fiyatı ($)' :
               'Toplam Temettü Tutarı ($)'}
            </label>
            <input
              type="number"
              name="price"
              value={trade.price}
              onChange={onChange}
              className="form-control"
              disabled={trade.type === 'Satış' && quantityError !== ''}
              placeholder={trade.type === 'Alış' ? '0.00' : undefined}
            />
          </div>

          <div className="form-group">
            <label>Komisyon ($)</label>
            <input
              type="number"
              name="commission"
              value={trade.commission}
              onChange={onChange}
              className="form-control"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          {trade.price && (trade.quantity || trade.type === 'Temettü') && (
            <div className="form-group">
              <label>Toplam TL Tutarı</label>
              <div className="tl-amount">
                {calculateTotalAmount()} <span className="exchange-rate">(1$ = {getFormattedExchangeRate()} ₺)</span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn-primary" onClick={handleSave}>
            {isEditing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeModal; 