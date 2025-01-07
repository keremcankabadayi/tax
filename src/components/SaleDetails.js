import React from 'react';
import './SaleDetails.css';

const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Tarihten bir önceki ayın endeks değerini bul
const getIndexForDate = (date, indexData) => {
  const d = new Date(date);
  // Bir önceki ay
  let year = d.getFullYear();
  let month = d.getMonth(); // 0-11 arası

  // Eğer ocak ayındaysak (0), önceki ay aralık (11) ve önceki yıl olacak
  if (month === 0) {
    month = 11;
    year = year - 1;
  } else {
    month = month - 1;
  }
  
  const monthNames = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 
                     'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];

  const yearData = indexData.find(y => y.yil === year);
  if (!yearData) return null;

  const indexValue = yearData.aylar[monthNames[month]];
  console.log(`Date: ${date}, Year: ${year}, Month: ${monthNames[month]}, Index: ${indexValue}`);
  return indexValue ? Number(indexValue.replace(',', '.')) : null;
};

const SaleDetails = ({ trade, trades, indexData }) => {
  // Satış işlemi için kullanılan alışları bul
  const getFIFODetails = () => {
    const symbol = trade.symbol;
    const saleDate = new Date(trade.date);
    let remainingSell = Number(trade.quantity);
    const details = [];
    const stockLedger = [];

    // Satış tarihinin endeks değeri
    const saleIndex = getIndexForDate(trade.date, indexData);

    // Satış tarihinden önceki alışları bul
    trades
      .filter(t => t.symbol === symbol && t.type === 'Alış' && new Date(t.date) < saleDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(buyTrade => {
        stockLedger.push({
          ...buyTrade,
          quantity: Number(buyTrade.quantity),
          remainingQuantity: Number(buyTrade.quantity)
        });
      });

    // FIFO hesaplaması
    while (remainingSell > 0 && stockLedger.length > 0) {
      const oldestBuy = stockLedger[0];
      const sellQuantity = Math.min(remainingSell, oldestBuy.remainingQuantity);
      
      const buyPriceTL = Number(oldestBuy.price) * Number(oldestBuy.exchangeRate);
      const sellPriceTL = Number(trade.price) * Number(trade.exchangeRate);
      const profitTL = (sellPriceTL - buyPriceTL) * sellQuantity;
      
      // Alışın toplam adedini ve kullanılan adedi hesapla
      const totalQuantity = Number(oldestBuy.quantity);

      // Alış tarihinin endeks değeri
      const buyIndex = getIndexForDate(oldestBuy.date, indexData);
      
      // Endeks değişim yüzdesi
      let indexChange = null;
      if (buyIndex && saleIndex) {
        indexChange = ((saleIndex - buyIndex) / buyIndex) * 100;
      }
      
      details.push({
        date: oldestBuy.date,
        quantity: sellQuantity,
        totalQuantity,
        buyPrice: Number(oldestBuy.price),
        buyPriceTL,
        sellPrice: Number(trade.price),
        sellPriceTL,
        profitTL,
        indexChange,
        buyIndex,
        saleIndex
      });

      if (sellQuantity === oldestBuy.remainingQuantity) {
        stockLedger.shift();
      } else {
        oldestBuy.remainingQuantity -= sellQuantity;
      }
      
      remainingSell -= sellQuantity;
    }

    return details;
  };

  if (trade.type !== 'Satış') return null;

  const fifoDetails = getFIFODetails();

  return (
    <div className="sale-details">
      <table className="sale-details-table">
        <thead>
          <tr>
            <th>Alış Tarihi</th>
            <th>Kullanılan / Toplam Adet</th>
            <th>Alış $ / ₺</th>
            <th>Satış $ / ₺</th>
            <th>Kâr/Zarar (₺)</th>
            <th>Endeks Değişimi (%)</th>
          </tr>
        </thead>
        <tbody>
          {fifoDetails.map((detail, index) => (
            <tr key={index}>
              <td>{detail.date}</td>
              <td>{formatNumber(detail.quantity)} / {formatNumber(detail.totalQuantity)}</td>
              <td>
                {formatNumber(detail.buyPrice.toFixed(2))} / {formatNumber(detail.buyPriceTL.toFixed(2))}
              </td>
              <td>
                {formatNumber(detail.sellPrice.toFixed(2))} / {formatNumber(detail.sellPriceTL.toFixed(2))}
              </td>
              <td className={detail.profitTL >= 0 ? 'profit' : 'loss'}>
                {formatNumber(detail.profitTL.toFixed(2))}
              </td>
              <td className={detail.indexChange >= 10 ? 'profit' : ''}>
                {detail.indexChange ? (
                  <>
                    {formatNumber(detail.indexChange.toFixed(2))}
                    {' '}
                    <span className="index-values">
                      ({formatNumber(detail.buyIndex.toFixed(2))} - {formatNumber(detail.saleIndex.toFixed(2))})
                    </span>
                  </>
                ) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SaleDetails; 