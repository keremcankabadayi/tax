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

// Tarihi Türkçe formata çevir
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
          remainingQuantity: Number(buyTrade.quantity),
          usedQuantity: 0
        });
      });

    // FIFO hesaplaması
    while (remainingSell > 0 && stockLedger.length > 0) {
      const oldestBuy = stockLedger[0];
      const sellQuantity = Math.min(remainingSell, oldestBuy.remainingQuantity);
      oldestBuy.usedQuantity += sellQuantity;
      
      // Birim fiyatlar
      const buyPriceUSD = Number(oldestBuy.price);
      const sellPriceUSD = Number(trade.price);
      const buyExchangeRate = Number(oldestBuy.exchangeRate);
      const sellExchangeRate = Number(trade.exchangeRate);

      // TL fiyatları
      const buyPriceTL = buyPriceUSD * buyExchangeRate;
      const sellPriceTL = sellPriceUSD * sellExchangeRate;

      // Toplam tutarlar
      const totalBuyUSD = buyPriceUSD * sellQuantity;
      const totalSellUSD = sellPriceUSD * sellQuantity;
      const totalBuyTL = buyPriceTL * sellQuantity;
      const totalSellTL = sellPriceTL * sellQuantity;

      // Kâr/Zarar
      const profitUSD = (sellPriceUSD - buyPriceUSD) * sellQuantity;
      const profitTL = (sellPriceTL - buyPriceTL) * sellQuantity;
      
      // Alışın toplam adedini ve kullanılan adedi hesapla
      const totalQuantity = Number(oldestBuy.quantity);

      // Alış tarihinin endeks değeri
      const buyIndex = getIndexForDate(oldestBuy.date, indexData);
      
      // Endeks değişim yüzdesi ve adjust edilmiş fiyatlar
      let indexChange = null;
      let adjustedBuyPriceTL = null;
      let adjustedTotalBuyTL = null;
      let adjustedProfitTL = null;

      if (buyIndex && saleIndex) {
        indexChange = ((saleIndex - buyIndex) / buyIndex) * 100;
        
        // %10 ve üzeri endeks değişiminde TL fiyat adjustı
        if (indexChange >= 10) {
          // Endeks değişimi kadar artır
          adjustedBuyPriceTL = buyPriceTL * (1 + (indexChange / 100));
          adjustedTotalBuyTL = adjustedBuyPriceTL * sellQuantity;
          adjustedProfitTL = totalSellTL - adjustedTotalBuyTL;
        }
      }
      
      details.push({
        date: oldestBuy.date,
        quantity: oldestBuy.usedQuantity,
        totalQuantity,
        buyPriceUSD,
        sellPriceUSD,
        buyPriceTL,
        sellPriceTL,
        totalBuyUSD,
        totalSellUSD,
        totalBuyTL,
        totalSellTL,
        profitUSD,
        profitTL,
        adjustedBuyPriceTL,
        adjustedTotalBuyTL,
        adjustedProfitTL,
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
        <tbody>
          <tr>
            <th>Satış Kuru</th>
            <td>{formatNumber(Number(trade.exchangeRate).toFixed(2))}</td>
          </tr>
          <tr>
            <th>Kâr/Zarar Detayları</th>
            <td>
              <table className="purchase-details-table">
                <thead>
                  <tr>
                    <th>Alış Tarihi</th>
                    <th>Adet</th>
                    <th>Alış Fiyatı ($)</th>
                    <th>Alış Tutarı ($)</th>
                    <th>Alış Tutarı (₺)</th>
                    <th>Endeks Değişimi</th>
                    <th>Kâr/Zarar (₺)</th>
                  </tr>
                </thead>
                <tbody>
                  {fifoDetails.map((detail, index) => (
                    <tr key={index}>
                      <td>{formatDateTR(detail.date)}</td>
                      <td>{formatNumber(detail.quantity)}</td>
                      <td>{formatNumber(Number(detail.buyPriceUSD).toFixed(2))}</td>
                      <td>{formatNumber(Number(detail.totalBuyUSD).toFixed(2))}</td>
                      <td>
                        {detail.indexChange >= 10 ? (
                          <>
                            <span className="strikethrough">{formatNumber(Number(detail.totalBuyTL).toFixed(2))}</span>
                            <br />
                            <span className="adjusted-price">{formatNumber(Number(detail.adjustedTotalBuyTL).toFixed(2))}</span>
                          </>
                        ) : (
                          formatNumber(Number(detail.totalBuyTL).toFixed(2))
                        )}
                      </td>
                      <td className={detail.indexChange >= 10 ? 'profit' : ''}>
                        {detail.indexChange ? (
                          <>
                            %{formatNumber(Number(detail.indexChange).toFixed(2))}
                            <br />
                            <span className="index-values">
                              ({formatNumber(Number(detail.buyIndex).toFixed(2))} → {formatNumber(Number(detail.saleIndex).toFixed(2))})
                            </span>
                          </>
                        ) : 'N/A'}
                      </td>
                      <td className={detail.indexChange >= 10 ? 
                        (detail.adjustedProfitTL >= 0 ? 'profit' : 'loss') : 
                        (detail.profitTL >= 0 ? 'profit' : 'loss')}>
                        {detail.indexChange >= 10 ? 
                          formatNumber(Number(detail.adjustedProfitTL).toFixed(2)) :
                          formatNumber(Number(detail.profitTL).toFixed(2))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <th>Satış Detayları</th>
            <td>
              <table className="sale-amounts-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>$</th>
                    <th>₺</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Satış Fiyatı</th>
                    <td>{formatNumber(Number(trade.price).toFixed(2))}</td>
                    <td>{formatNumber(Number(trade.priceTL).toFixed(2))}</td>
                  </tr>
                  <tr>
                    <th>Komisyon</th>
                    <td>{formatNumber(Number(trade.commission || 0).toFixed(2))}</td>
                    <td>{formatNumber(Number(trade.commissionTL || 0).toFixed(2))}</td>
                  </tr>
                  <tr>
                    <th>Stopaj</th>
                    <td>{formatNumber(Number(trade.withholding || 0).toFixed(2))}</td>
                    <td>{formatNumber(Number((trade.withholding * trade.exchangeRate) || 0).toFixed(2))}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SaleDetails; 