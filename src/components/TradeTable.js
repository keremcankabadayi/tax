import React, { useState, useEffect, useRef } from 'react';
import './TradeTable.css';
import Notification from './Notification';
import SaleDetails from './SaleDetails';
import DividendDetails from './DividendDetails';
import TaxCalculation from './TaxCalculation';
import { fetchFromPantry } from '../utils/api';

const STORAGE_KEY = 'tax_trades_data';
const PANTRY_ID = '60e512d0-f495-4a56-b640-e0e30632d99f';

// Sayıyı virgüllü formata çevir
const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
  return indexValue ? Number(indexValue.replace(',', '.')) : null;
};

const TradeTable = ({ temettuIstisnasi }) => {
  // localStorage'dan verileri al veya boş array kullan
  const initialTrades = () => {
    const savedTrades = localStorage.getItem(STORAGE_KEY);
    return savedTrades ? JSON.parse(savedTrades) : [];
  };

  const [trades, setTrades] = useState(initialTrades);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [remainingShares, setRemainingShares] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [indexData, setIndexData] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [profitLossTL, setProfitLossTL] = useState({});
  const [newTrade, setNewTrade] = useState({
    symbol: '',
    type: 'Alış',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [openRows, setOpenRows] = useState([]);
  const menuRefs = useRef({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExchangeRates, setIsLoadingExchangeRates] = useState(true);
  const [isLoadingIndexData, setIsLoadingIndexData] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);

  // Exchange rate verilerini çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingExchangeRates(true);
        setIsLoadingIndexData(true);
        
        // Döviz kurlarını çek
        const exchangeRatesData = await fetchFromPantry('usdtry', 0, (count, delay) => {
          setRetryCount(count);
          setRetryDelay(delay);
        });
        
        // Exchange rates işleme
        const sortedData = Object.entries(exchangeRatesData)
          .filter(([key]) => key !== 'key')
          .sort(([dateA], [dateB]) => {
            const [dayA, monthA, yearA] = dateA.split('.');
            const [dayB, monthB, yearB] = dateB.split('.');
            return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
          })
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

        setExchangeRates(sortedData);
        setIsLoadingExchangeRates(false);
        setRetryCount(0);
        
        // Endeks verilerini çek
        const indexData = await fetchFromPantry('yiufe', 0, (count, delay) => {
          setRetryCount(count);
          setRetryDelay(delay);
        });
        
        // Index data işleme
        if (indexData.veriler) {
          setIndexData(indexData.veriler);
        }
        setIsLoadingIndexData(false);
        setRetryCount(0);
      } catch (error) {
        console.error('Veri çekme hatası:', error);
        addNotification('Veriler alınamadı. Lütfen sayfayı yenileyin.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // İşlem tarihine göre döviz kurunun bulunması
  const getExchangeRateForDate = (date) => {
    // Verilen tarihten bir önceki iş gününün kurunun bulunması
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}.${month}.${year}`;
    
    // Tarihleri dolaş ve verilen tarihten önceki ilk kuru bul
    for (const [rateDate, rateData] of Object.entries(exchangeRates)) {
      const [rateDay, rateMonth, rateYear] = rateDate.split('.');
      const rateDateTime = new Date(rateYear, rateMonth - 1, rateDay);
      const tradeDateTime = new Date(year, month - 1, day);
      
      if (rateDateTime < tradeDateTime) {
        return rateData.forex_buying;
      }
    }
    
    // Eğer uygun kur bulunamazsa en son kuru kullan
    const lastRate = Object.values(exchangeRates)[0];
    return lastRate ? lastRate.forex_buying : null;
  };

  // Verileri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  // Bildirim eklemek için yardımcı fonksiyon
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  // Bildirimi kaldırmak için yardımcı fonksiyon
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Bugünün tarihini YYYY-MM-DD formatında al
  const today = new Date().toISOString().split('T')[0];

  // FIFO hesaplaması için işlemleri takip et
  useEffect(() => {
    const calculateFIFO = () => {
      const stockLedger = {};
      const remaining = {};
      const profitLossCalc = {};
      const symbols = [...new Set(trades.map(trade => trade.symbol))];

      // Her sembol için kâr/zarar hesapla
      symbols.forEach(symbol => {
        const trades_by_symbol = trades.filter(trade => trade.symbol === symbol);
        let totalProfitTL = 0;
        
        const stockLedger = [];
        trades_by_symbol.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(trade => {
          if (trade.type === 'Alış') {
            stockLedger.push({
              quantity: Number(trade.quantity),
              price: Number(trade.price),
              exchangeRate: Number(trade.exchangeRate),
              date: trade.date
            });
            if (!remaining[symbol]) remaining[symbol] = 0;
            remaining[symbol] += Number(trade.quantity);
          } else if (trade.type === 'Satış') {
            let remainingSell = Number(trade.quantity);
            const sellPrice = Number(trade.price);
            const sellExchangeRate = Number(trade.exchangeRate);
            const saleDate = trade.date;
            const saleIndex = getIndexForDate(saleDate, indexData);

            while (remainingSell > 0 && stockLedger.length > 0) {
              const oldestBuy = stockLedger[0];
              const sellQuantity = Math.min(remainingSell, oldestBuy.quantity);
              
              // TL cinsinden kâr/zarar hesapla
              const buyPriceTL = oldestBuy.price * oldestBuy.exchangeRate;
              const sellPriceTL = sellPrice * sellExchangeRate;

              // Endeks değişimini kontrol et
              const buyIndex = getIndexForDate(oldestBuy.date, indexData);
              let adjustedBuyPriceTL = buyPriceTL;

              if (buyIndex && saleIndex) {
                const indexChange = ((saleIndex - buyIndex) / buyIndex) * 100;
                if (indexChange >= 10) {
                  adjustedBuyPriceTL = buyPriceTL * (1 + (indexChange / 100));
                }
              }

              const profitTL = (sellPriceTL - adjustedBuyPriceTL) * sellQuantity;
              totalProfitTL += profitTL;

              if (sellQuantity === oldestBuy.quantity) {
                stockLedger.shift();
              } else {
                oldestBuy.quantity -= sellQuantity;
              }
              
              remainingSell -= sellQuantity;
              if (!remaining[symbol]) remaining[symbol] = 0;
              remaining[symbol] -= sellQuantity;
            }
          }
        });

        profitLossCalc[symbol] = totalProfitTL;
      });

      setRemainingShares(remaining);
      setProfitLossTL(profitLossCalc);
    };

    calculateFIFO();
  }, [trades, indexData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTrade(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTrade = async () => {
    if (newTrade.symbol && newTrade.price && newTrade.date && 
        (newTrade.type === 'Temettü' || newTrade.quantity)) {
      try {
        const exchangeRate = getExchangeRateForDate(newTrade.date);
        
        if (!exchangeRate) {
          addNotification('Seçilen tarih için döviz kuru bulunamadı.', 'error');
          return;
        }

        const quantity = newTrade.type === 'Temettü' ? 
          (remainingShares[newTrade.symbol] || 0) : 
          Number(newTrade.quantity);

        const tradeWithTL = {
          ...newTrade,
          quantity: quantity,
          price: Number(newTrade.price),
          exchangeRate: exchangeRate,
          priceTL: Number(newTrade.price) * exchangeRate * (newTrade.type === 'Temettü' ? 1 : quantity)
        };

        if (editingIndex !== null) {
          // Düzenleme modu
          const updatedTrades = [...trades];
          
          if (tradeWithTL.type === 'Satış') {
            // Düzenlenen işlemi hariç tut ve stok kontrolü yap
            const otherTrades = trades.filter((_, index) => index !== editingIndex);
            const tempStockLedger = {};
            
            otherTrades.forEach(trade => {
              if (!tempStockLedger[trade.symbol]) {
                tempStockLedger[trade.symbol] = 0;
              }
              if (trade.type === 'Alış') {
                tempStockLedger[trade.symbol] += Number(trade.quantity);
              } else if (trade.type === 'Satış') {
                tempStockLedger[trade.symbol] -= Number(trade.quantity);
              }
            });

            const availableShares = tempStockLedger[newTrade.symbol] || 0;
            if (Number(newTrade.quantity) > availableShares) {
              addNotification(`Yetersiz hisse! ${newTrade.symbol} için satılabilecek maksimum adet: ${availableShares}`, 'error');
              return;
            }
          }

          updatedTrades[editingIndex] = tradeWithTL;
          setTrades(updatedTrades);
          setEditingIndex(null);
          addNotification('İşlem başarıyla güncellendi.', 'success');
        } else {
          // Yeni işlem ekleme modu
          if (tradeWithTL.type === 'Satış') {
            const availableShares = remainingShares[newTrade.symbol] || 0;
            if (Number(newTrade.quantity) > availableShares) {
              addNotification(`Yetersiz hisse! ${newTrade.symbol} için satılabilecek maksimum adet: ${availableShares}`, 'error');
              return;
            }
          } else if (tradeWithTL.type === 'Temettü' && quantity === 0) {
            addNotification(`${newTrade.symbol} için eldeki hisse bulunmamaktadır!`, 'error');
            return;
          }

          setTrades(prev => [...prev, tradeWithTL]);
          addNotification('Yeni işlem başarıyla eklendi.', 'success');
        }
        
        setNewTrade({
          symbol: '',
          type: 'Alış',
          quantity: '',
          price: '',
          date: new Date().toISOString().split('T')[0]
        });
        setIsAdding(false);
      } catch (error) {
        addNotification('İşlem eklenirken hata oluştu: ' + error.message, 'error');
      }
    } else {
      addNotification('Lütfen tüm alanları doldurun.', 'error');
    }
  };

  const handleEdit = (index) => {
    const tradeToEdit = trades[index];
    setNewTrade({ ...tradeToEdit });
    setEditingIndex(index);
    setIsAdding(true);
  };

  const handleDelete = (index) => {
    const tradeToDelete = trades[index];
    
    // Kullanıcıdan onay al
    const confirmMessage = `${tradeToDelete.symbol} hissesinin ${tradeToDelete.date} tarihli ${tradeToDelete.type.toLowerCase()} işlemini silmek istediğinize emin misiniz?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    // Satış işlemlerini kontrol et
    if (tradeToDelete.type === 'Alış') {
      // Bu alış işleminden sonraki satışları kontrol et
      const laterTrades = trades.slice(index + 1);
      const symbol = tradeToDelete.symbol;
      let availableShares = 0;
      
      // İlgili hissenin kalan bakiyesini hesapla
      trades.slice(0, index).forEach(trade => {
        if (trade.symbol === symbol) {
          if (trade.type === 'Alış') {
            availableShares += Number(trade.quantity);
          } else {
            availableShares -= Number(trade.quantity);
          }
        }
      });

      // Sonraki satışları kontrol et
      let requiredShares = 0;
      laterTrades.forEach(trade => {
        if (trade.symbol === symbol && trade.type === 'Satış') {
          requiredShares += Number(trade.quantity);
        }
      });

      // Eğer bu alış işleminin silinmesi durumunda yetersiz hisse olacaksa
      if (requiredShares > availableShares) {
        addNotification('Bu alış işlemi silinemez çünkü sonraki satış işlemleri için gerekli!', 'error');
        return;
      }
    }

    const updatedTrades = trades.filter((_, i) => i !== index);
    setTrades(updatedTrades);
    addNotification('İşlem başarıyla silindi.', 'success');
  };

  // Mevcut sembolleri al
  const getAvailableSymbols = () => {
    const symbols = new Set();
    
    // Eğer temettü işlemi ise, herhangi bir zamanda alınmış ve hala elde olan hisseleri göster
    if (newTrade.type === 'Temettü') {
      trades.forEach(trade => {
        if (trade.type === 'Alış') {
          symbols.add(trade.symbol);
        }
      });
    } else {
      // Satış işlemi için sadece eldeki hisseleri göster
      Object.entries(remainingShares).forEach(([symbol, quantity]) => {
        if (quantity > 0) {
          symbols.add(symbol);
        }
      });
    }
    
    return Array.from(symbols).sort();
  };

  // Sembol bazında özet bilgileri göster
  const renderSummary = () => {
    const symbols = [...new Set(trades.map(trade => trade.symbol))];
    
    // TL cinsinden temettü hesapla
    const dividendTotals = {};
    
    symbols.forEach(symbol => {
      const trades_by_symbol = trades.filter(trade => trade.symbol === symbol);
      let totalDividendUSD = 0;
      let totalDividendTL = 0;
      
      trades_by_symbol.forEach(trade => {
        if (trade.type === 'Temettü') {
          totalDividendUSD += Number(trade.price);
          totalDividendTL += Number(trade.priceTL);
        }
      });
      
      dividendTotals[symbol] = {
        usd: totalDividendUSD,
        tl: totalDividendTL
      };
    });

    // Toplam kâr/zarar ve temettü
    const totalProfitLossTL = Object.values(profitLossTL).reduce((sum, value) => sum + value, 0);
    const totalDividendUSD = Object.values(dividendTotals).reduce((sum, value) => sum + value.usd, 0);
    const totalDividendTL = Object.values(dividendTotals).reduce((sum, value) => sum + value.tl, 0);

    return (
      <div className="summary-section">
        <h3>Özet Bilgiler</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Sembol</th>
              <th>Eldeki Adet</th>
              <th>Kâr/Zarar (₺)</th>
              <th>Temettü ($)</th>
              <th>Temettü (₺)</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map(symbol => (
              <>
                <tr 
                  key={symbol} 
                  className={`summary-row ${openRows.includes(`summary-${symbol}`) ? 'expanded' : ''}`}
                  onClick={() => {
                    const hasDividends = trades.some(t => t.symbol === symbol && t.type === 'Temettü');
                    if (hasDividends) {
                      setOpenRows(prev => {
                        const key = `summary-${symbol}`;
                        if (prev.includes(key)) {
                          return prev.filter(i => i !== key);
                        } else {
                          return [...prev, key];
                        }
                      });
                    }
                  }}
                  style={{ cursor: trades.some(t => t.symbol === symbol && t.type === 'Temettü') ? 'pointer' : 'default' }}
                >
                  <td>
                    {trades.some(t => t.symbol === symbol && t.type === 'Temettü') && (
                      <span className={`collapse-icon ${openRows.includes(`summary-${symbol}`) ? 'open' : ''}`}>▶</span>
                    )}
                    {symbol}
                  </td>
                  <td>{formatNumber(remainingShares[symbol] || 0)}</td>
                  <td className={profitLossTL[symbol] >= 0 ? 'profit' : 'loss'}>
                    {formatNumber(profitLossTL[symbol].toFixed(2))}
                  </td>
                  <td>{formatNumber(dividendTotals[symbol].usd.toFixed(2))}</td>
                  <td>{formatNumber(dividendTotals[symbol].tl.toFixed(2))}</td>
                </tr>
                {openRows.includes(`summary-${symbol}`) && (
                  <tr className="dividend-details-row">
                    <td colSpan="5">
                      <table className="dividend-details-table">
                        <thead>
                          <tr>
                            <th>Tarih</th>
                            <th>Hisse Adedi</th>
                            <th>Hisse Başı ($)</th>
                            <th>Toplam ($)</th>
                            <th>Toplam (₺)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades
                            .filter(t => t.symbol === symbol && t.type === 'Temettü')
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map((dividend, index) => (
                              <tr key={index}>
                                <td>{formatDateTR(dividend.date)}</td>
                                <td>{formatNumber(dividend.quantity)}</td>
                                <td>{formatNumber((dividend.price / dividend.quantity).toFixed(4))}</td>
                                <td>{formatNumber(dividend.price.toFixed(2))}</td>
                                <td>{formatNumber(dividend.priceTL.toFixed(2))}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
            <tr className="total-row">
              <td>TOPLAM</td>
              <td>-</td>
              <td className={totalProfitLossTL >= 0 ? 'profit' : 'loss'}>
                {formatNumber(totalProfitLossTL.toFixed(2))}
              </td>
              <td>{formatNumber(totalDividendUSD.toFixed(2))}</td>
              <td>{formatNumber(totalDividendTL.toFixed(2))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const handleRowClick = (index) => {
    setOpenRows(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Açık olan menüleri kontrol et
      Object.entries(menuRefs.current).forEach(([key, ref]) => {
        if (ref && !ref.contains(event.target) && openRows.includes(key)) {
          setOpenRows(prev => prev.filter(item => item !== key));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openRows]);

  return (
    <div className="trade-table-container">
      {isLoading ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            {retryCount > 0 ? 
              `Rate limit aşıldı. ${retryCount}. deneme yapılıyor... (${(retryDelay / 1000).toFixed(1)} saniye bekleniyor)` :
              isLoadingExchangeRates ? 'Döviz kurları yükleniyor...' : 
              isLoadingIndexData ? 'Endeks verileri yükleniyor...' : 
              'Veriler yükleniyor...'}
          </div>
        </div>
      ) : (
        <>
          <div className="notification-container">
            {notifications.map(notification => (
              <Notification
                key={notification.id}
                message={notification.message}
                type={notification.type}
                onClose={() => removeNotification(notification.id)}
              />
            ))}
          </div>
          
          {trades.length > 0 && (
            <div className="summary-container">
              {renderSummary()}
              <TaxCalculation 
                trades={trades}
                profitLoss={profitLossTL}
                temettuIstisnasi={temettuIstisnasi}
              />
            </div>
          )}
          <div className="trade-table-wrapper">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>İşlem Tarihi</th>
                  <th>İşlem Tipi</th>
                  <th>Sembol</th>
                  <th>Adet</th>
                  <th>Fiyat ($)</th>
                  <th>Fiyat (₺)</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {trades
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((trade, index) => (
                    <>
                      <tr 
                        key={`row-${index}`}
                        className={`trade-row ${openRows.includes(index) ? 'expanded' : ''}`} 
                        onClick={() => trade.type === 'Satış' && handleRowClick(index)}
                      >
                        <td>
                          {trade.type === 'Satış' && (
                            <span className={`collapse-icon ${openRows.includes(index) ? 'open' : ''}`}>▶</span>
                          )}
                          {formatDateTR(trade.date)}
                        </td>
                        <td>{trade.type}</td>
                        <td>{trade.symbol}</td>
                        <td>
                          {trade.type === 'Temettü' ? 
                            formatNumber(remainingShares[trade.symbol] || 0) :
                            formatNumber(trade.quantity)
                          }
                        </td>
                        <td>
                          {formatNumber(Number(trade.price).toFixed(2))}
                        </td>
                        <td>
                          {formatNumber(Number(trade.priceTL).toFixed(2))}
                          {' '}
                          <span className="exchange-rate">
                            (1$ = {Number(trade.exchangeRate).toFixed(2)} ₺)
                          </span>
                        </td>
                        <td>
                          <div 
                            className="actions-menu"
                            ref={el => menuRefs.current[`menu-${index}`] = el}
                          >
                            <button 
                              className="menu-toggle" 
                              onClick={(e) => {
                                e.stopPropagation();
                                const menuKey = `menu-${index}`;
                                const currentOpen = openRows.includes(menuKey);
                                setOpenRows(prev => 
                                  currentOpen 
                                    ? prev.filter(i => i !== menuKey)
                                    : [...prev, menuKey]
                                );
                              }}
                            >
                              ⋮
                            </button>
                            {openRows.includes(`menu-${index}`) && (
                              <div className="menu-items">
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(index); }}>
                                  Düzenle
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(index); }}>
                                  Sil
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {openRows.includes(index) && trade.type === 'Satış' && (
                        <tr key={`details-${index}`} className="details-row">
                          <td colSpan="7">
                            <SaleDetails 
                              trade={trade} 
                              trades={trades} 
                              indexData={indexData}
                              getIndexForDate={getIndexForDate}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                {isAdding && (
                  <tr className="adding-row">
                    <td>
                      <input
                        type="date"
                        name="date"
                        value={newTrade.date}
                        onChange={handleInputChange}
                        max={today}
                        className="table-input"
                      />
                    </td>
                    <td>
                      <select
                        name="type"
                        value={newTrade.type}
                        onChange={handleInputChange}
                        className="table-input"
                      >
                        <option value="Alış">Alış</option>
                        <option value="Satış">Satış</option>
                        <option value="Temettü">Temettü</option>
                      </select>
                    </td>
                    <td>
                      {newTrade.type === 'Alış' ? (
                        <input
                          type="text"
                          name="symbol"
                          value={newTrade.symbol}
                          onChange={handleInputChange}
                          placeholder="AAPL"
                          className="table-input"
                        />
                      ) : (
                        <select
                          name="symbol"
                          value={newTrade.symbol}
                          onChange={handleInputChange}
                          className="table-input"
                        >
                          <option value="">Sembol Seçin</option>
                          {getAvailableSymbols().map(symbol => (
                            <option key={symbol} value={symbol}>
                              {symbol} ({remainingShares[symbol] || 0} adet)
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {newTrade.type === 'Temettü' ? (
                        <input
                          type="number"
                          name="quantity"
                          value={remainingShares[newTrade.symbol] || ''}
                          disabled
                          className="table-input"
                        />
                      ) : (
                        <input
                          type="number"
                          name="quantity"
                          value={newTrade.quantity}
                          onChange={handleInputChange}
                          placeholder="100"
                          className="table-input"
                        />
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        name="price"
                        value={newTrade.price}
                        onChange={handleInputChange}
                        placeholder={
                          newTrade.type === 'Alış' ? 'Alış Fiyatı' : 
                          newTrade.type === 'Satış' ? 'Satış Fiyatı' :
                          'Toplam Temettü Tutarı ($)'
                        }
                        className="table-input"
                      />
                    </td>
                    <td>
                      {newTrade.price && (newTrade.quantity || newTrade.type === 'Temettü') ? (
                        <>
                          {formatNumber((Number(newTrade.price) * (getExchangeRateForDate(newTrade.date) || 0) * (newTrade.type === 'Temettü' ? 1 : Number(newTrade.quantity))).toFixed(2))}
                          {' '}
                          <span className="exchange-rate">
                            (1$ = {(getExchangeRateForDate(newTrade.date) || 0).toFixed(2)} ₺)
                          </span>
                        </>
                      ) : '-'}
                    </td>
                    <td>
                      <button className="save-btn" onClick={handleAddTrade}>
                        {editingIndex !== null ? 'Güncelle' : 'Kaydet'}
                      </button>
                      <button 
                        className="cancel-btn" 
                        onClick={() => {
                          setIsAdding(false);
                          setEditingIndex(null);
                          setNewTrade({
                            symbol: '',
                            type: 'Alış',
                            quantity: '',
                            price: '',
                            date: new Date().toISOString().split('T')[0]
                          });
                        }}
                      >
                        İptal
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!isAdding && (
            <button className="add-trade-btn" onClick={() => setIsAdding(true)}>
              Yeni İşlem Ekle
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TradeTable; 