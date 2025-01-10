import React from 'react';
import './DividendDetails.css';

const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatDateTR = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const DividendDetails = ({ trade, trades }) => {
  // Sembol için tüm temettü işlemlerini bul
  const dividendHistory = trades
    .filter(t => t.symbol === trade.symbol && t.type === 'Temettü')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="dividend-details">
      <h4>Temettü Geçmişi</h4>
      <table className="dividend-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Hisse Adedi</th>
            <th>Hisse Başı ($)</th>
            <th>Toplam ($)</th>
            <th>Toplam (₺)</th>
            <th>Kur</th>
          </tr>
        </thead>
        <tbody>
          {dividendHistory.map((dividend, index) => (
            <tr key={index}>
              <td>{formatDateTR(dividend.date)}</td>
              <td>{formatNumber(dividend.quantity)}</td>
              <td>{formatNumber((dividend.price / dividend.quantity).toFixed(4))}</td>
              <td>{formatNumber(dividend.price.toFixed(2))}</td>
              <td>{formatNumber(dividend.priceTL.toFixed(2))}</td>
              <td>1$ = {dividend.exchangeRate.toFixed(2)} ₺</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DividendDetails; 